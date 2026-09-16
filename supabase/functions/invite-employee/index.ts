import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_ROLES = ["employee", "dept_head", "admin", "super_admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return json({ error: "Server is not configured to send invitations." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Not signed in." }, 401);

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Not signed in." }, 401);

    const admin = createClient(url, serviceKey);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const callerRoles = (roles ?? []).map((r: { role: string }) => r.role);
    if (!callerRoles.includes("admin") && !callerRoles.includes("super_admin")) {
      return json({ error: "Only admins can invite employees." }, 403);
    }
    if (!callerRoles.includes("super_admin")) {
      // plain admins may not mint other admins
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const position = String(body.position ?? "").trim();
    const employeeId = String(body.employee_id ?? "").trim();
    const departmentId = body.department_id ? String(body.department_id) : null;
    const role = ALLOWED_ROLES.includes(body.role) ? String(body.role) : "employee";
    const redirectTo = String(body.redirect_to ?? "");

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!firstName || !lastName) return json({ error: "First and last name are required." }, 400);
    if (role === "super_admin" && !callerRoles.includes("super_admin")) {
      return json({ error: "Only a super admin can create another super admin." }, 403);
    }
    if ((role === "admin" || role === "super_admin") && !callerRoles.includes("super_admin")) {
      return json({ error: "Only a super admin can grant admin access." }, 403);
    }

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: { first_name: firstName, last_name: lastName },
    });

    if (inviteErr || !invited?.user) {
      const msg = inviteErr?.message ?? "Could not send the invitation.";
      const already = /already|registered|exists/i.test(msg);
      return json(
        { error: already ? "Someone with that email address already has an account." : msg },
        already ? 409 : 400,
      );
    }

    const newUserId = invited.user.id;

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: newUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        position: position || null,
        employee_id: employeeId || null,
        department_id: departmentId,
        role,
        status: "active",
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userData.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileErr) return json({ error: profileErr.message }, 400);

    await admin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role });
    if (roleErr) return json({ error: roleErr.message }, 400);

    await admin.from("notifications").insert({
      user_id: newUserId,
      title: "Welcome to the portal",
      message: "Your account has been created. Check your email to set a password.",
      type: "system",
    });

    return json({ success: true, user_id: newUserId, email });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error." }, 500);
  }
});
