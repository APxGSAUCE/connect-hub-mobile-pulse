// Regression test: an employee can submit an access request, but cannot
// approve themselves or change their own role.
//
// Run with the supabase test_edge_functions tool (Deno test runner).
// Uses the publishable (anon) key only, so it runs anywhere. If
// SUPABASE_SERVICE_ROLE_KEY happens to be available the temporary test
// account is deleted afterwards; otherwise the account stays as a
// clearly-named "regression+..." record for manual cleanup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://lfhfmsguftzlzurunxzg.supabase.co";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaGZtc2d1ZnR6bHp1cnVueHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjEyMjIsImV4cCI6MjA2NjgzNzIyMn0.yHMSUht8I8JJKxEZxx7X68cs-wLHlzC5JmUBdIrsGvU";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.test("access request: submit allowed, self-approval and role change blocked", async () => {
  const email = `qa-${crypto.randomUUID()}@regression-test.dev`;
  const password = `Regr3ssion!${crypto.randomUUID().slice(0, 8)}`;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signUp, error: signUpError } = await client.auth.signUp({
    email,
    password,
    options: { data: { first_name: "Regression", last_name: "Test" } },
  });
  assertEquals(signUpError, null, `sign up failed: ${signUpError?.message}`);

  const userId = signUp.user?.id;
  assert(userId, "expected a new user id");

  if (!signUp.session) {
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    assertEquals(signInError, null, `sign in failed: ${signInError?.message}`);
  }

  try {
    // 1. Submitting an access request must succeed and set the status to pending.
    const { error: rpcError } = await client.rpc("request_access_approval", {
      request_notes: "Automated regression test request",
    });
    assertEquals(rpcError, null, `request_access_approval failed: ${rpcError?.message}`);

    const { data: profile } = await client
      .from("profiles")
      .select("approval_status, approved_by, approved_at")
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
  } finally {
    await client.auth.signOut();
    if (SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.auth.admin.deleteUser(userId!);
    }
  }
});
