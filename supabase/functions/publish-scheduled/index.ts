import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // Supabase verifies the caller's JWT because verify_jwt is enabled
  // for this function. Also require the caller to be an approved author.
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization") || "";

  if (!url || !anonKey || !serviceRoleKey || !authorization.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const db = createClient(url, serviceRoleKey);
  const { data: admin, error: adminError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  try {
    // Find all posts that are scheduled and whose time has come
    const now = new Date().toISOString();
    const { data: duePosts, error: findErr } = await db
      .from("posts")
      .select("id, slug, title")
      .eq("published", false)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (findErr) throw findErr;

    if (!duePosts || duePosts.length === 0) {
      return new Response(
        JSON.stringify({ published: 0, message: "No scheduled posts due." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Publish each due post
    let published = 0;
    for (const post of duePosts) {
      const { error: pubErr } = await db
        .from("posts")
        .update({
          published: true,
          published_at: now,
          scheduled_at: null,
        })
        .eq("id", post.id);

      if (pubErr) {
        console.error(`Failed to publish post ${post.id}:`, pubErr.message);
      } else {
        published++;
      }
    }

    return new Response(
      JSON.stringify({
        published,
        total: duePosts.length,
        message: `Published ${published} of ${duePosts.length} scheduled posts.`,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Scheduled publish error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
