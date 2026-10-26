// Temporary, secret-protected password setup endpoint.
// Configure ADMIN_PASSWORD_SETUP_SECRET and ADMIN_PASSWORD_SETUP_EMAIL as Edge Function secrets.
// Uses Supabase's built-in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY server-side secrets.
// Delete this function and remove its secret immediately after one successful use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const setupSecret = Deno.env.get("ADMIN_PASSWORD_SETUP_SECRET");
  const allowedEmail = Deno.env.get("ADMIN_PASSWORD_SETUP_EMAIL")?.trim().toLowerCase();
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!setupSecret || !allowedEmail || !url || !serviceKey) {
    return json({ error: "Server configuration is incomplete." }, 500);
  }
  const supplied = req.headers.get("x-setup-secret") ?? "";
  if (supplied.length !== setupSecret.length ||
      !crypto.subtle || supplied !== setupSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  let body: { email?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (email !== allowedEmail) return json({ error: "Email is not allowed." }, 403);
  if (password.length < 12 || password.length > 128) {
    return json({ error: "Password must be 12–128 characters." }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return json({ error: "Could not verify the account." }, 500);
  const user = users.users.find((u) => u.email?.toLowerCase() === allowedEmail);
  if (!user) return json({ error: "Authorized account was not found." }, 404);

  const { data: grant, error: grantError } = await admin
    .from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (grantError || !grant) return json({ error: "Account is not in the admin allowlist." }, 403);

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (updateError) return json({ error: "Password update failed." }, 500);

  return json({
    success: true,
    message: "Password updated. Delete this temporary function and remove ADMIN_PASSWORD_SETUP_SECRET now.",
  });
});
