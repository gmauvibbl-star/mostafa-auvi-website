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

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, key);

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
