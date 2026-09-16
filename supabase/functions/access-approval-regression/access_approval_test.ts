// Regression test: an employee can submit an access request, but cannot
// approve themselves or change their own role.
//
// Run with the supabase test_edge_functions tool (Deno test runner).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.test("access request flow: submit allowed, self-approval and role change blocked", async () => {
  const email = `regression+${crypto.randomUUID()}@example.com`;
  const password = `Regr3ssion!${crypto.randomUUID().slice(0, 8)}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Regression", last_name: "Test" },
  });
  assertEquals(createError, null);
  const userId = created!.user!.id;

  try {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    assertEquals(signInError, null);

    // 1. Submitting an access request must succeed and set the status to pending.
    const { error: rpcError } = await client.rpc("request_access_approval", {
      request_notes: "Automated regression test request",
    });
    assertEquals(rpcError, null, `request_access_approval failed: ${rpcError?.message}`);

    const { data: profile } = await client
      .from("profiles")
      .select("approval_status, approval_notes, approved_by, approved_at")
      .eq("id", userId)
      .maybeSingle();
    assertEquals(profile?.approval_status, "pending");
    assertEquals(profile?.approved_by, null);
    assertEquals(profile?.approved_at, null);

    // The submission must be recorded for auditing.
    const { data: audit } = await client
      .from("access_request_audit")
      .select("action, outcome")
      .eq("profile_id", userId);
    assert(
      (audit ?? []).some((row) => row.action === "request_submitted" && row.outcome === "success"),
      "expected a successful request_submitted audit entry",
    );

    // 2. Self-approval must be rejected.
    const { error: selfApproveError } = await client
      .from("profiles")
      .update({ approval_status: "approved", approved_by: userId })
      .eq("id", userId);
    assert(selfApproveError, "self-approval should have been rejected");

    // 3. Self-service role escalation must be rejected.
    const { error: roleError } = await client
      .from("profiles")
      .update({ role: "super_admin" })
      .eq("id", userId);
    assert(roleError, "changing own profile role should have been rejected");

    const { error: userRoleError } = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });
    assert(userRoleError, "granting yourself a role should have been rejected");

    // 4. Reviewing your own request must be rejected.
    const { error: selfReviewError } = await client.rpc("review_access_request", {
      _profile_id: userId,
      _approve: true,
      _notes: "self review",
    });
    assert(selfReviewError, "self review should have been rejected");

    // The status must still be pending after every blocked attempt.
    const { data: after } = await client
      .from("profiles")
      .select("approval_status")
      .eq("id", userId)
      .maybeSingle();
    assertEquals(after?.approval_status, "pending");

    await client.auth.signOut();
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
});
