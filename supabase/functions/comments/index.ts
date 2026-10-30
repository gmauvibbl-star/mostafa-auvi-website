import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_ORIGIN = (Deno.env.get("SITE_ORIGIN") || "https://gmauvibbl-star.github.io").replace(/\/$/, "");
const cors = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function clean(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "শুধু POST অনুরোধ গ্রহণযোগ্য।" });
  if (req.headers.get("origin") && req.headers.get("origin") !== SITE_ORIGIN) {
    return json(403, { error: "এই ওয়েবসাইট থেকে অনুরোধটি গ্রহণযোগ্য নয়।" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const rateSalt = Deno.env.get("COMMENT_RATE_LIMIT_SALT");
  if (!supabaseUrl || !serviceKey || !turnstileSecret || !rateSalt) {
    return json(503, { error: "মন্তব্য নিরাপত্তা ব্যবস্থা এখনো সম্পূর্ণ কনফিগার করা হয়নি।" });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").normalize("NFKC").trim();
    const comment = String(body.comment || "").normalize("NFKC").trim();
    const slug = String(body.slug || "").trim();
    const token = String(body.turnstileToken || "").trim();
    const honeypot = String(body.website || "").trim();

    if (honeypot) return json(200, { message: "ধন্যবাদ।" });
    if (!name || name.length > 60 || !comment || comment.length > 2000 ||
        !slug || slug.length > 180 || !/^[\p{L}\p{N}\p{M} .,'’_()\-]+$/u.test(name)) {
      return json(400, { error: "নাম, মন্তব্য অথবা লেখার পরিচিতি সঠিক নয়।" });
    }
    if (!token) return json(400, { error: "মানব-যাচাই সম্পন্ন করুন।" });

    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: token,
        remoteip: req.headers.get("cf-connecting-ip") || ""
      })
    });
    const verificationResult = await verification.json();
    if (!verification.ok || !verificationResult.success) {
      return json(400, { error: "মানব-যাচাই ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" });
    }

    const ip = req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (ip === "unknown") return json(400, { error: "নিরাপদে অনুরোধ যাচাই করা যাচ্ছে না।" });

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const ipHash = await sha256(rateSalt + ":" + ip);
    const { data: allowed, error: rateError } = await db.rpc("consume_comment_rate_limit", {
      p_ip_hash: ipHash, p_max_requests: 5, p_window_seconds: 600
    });
    if (rateError) throw rateError;
    if (allowed !== true) return json(429, { error: "১০ মিনিটে সর্বোচ্চ ৫টি মন্তব্য করা যাবে। কিছুক্ষণ পর আবার চেষ্টা করুন।" });

    const { data: post, error: postError } = await db.from("posts")
      .select("slug").eq("slug", slug).eq("published", true).maybeSingle();
    if (postError) throw postError;
    if (!post) return json(404, { error: "লেখাটি প্রকাশিত নয় বা পাওয়া যায়নি।" });

    const urlMatches = comment.match(/https?:\/\/|www\./gi) || [];
    if (urlMatches.length > 2 || /(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly)\//i.test(comment)) {
      return json(400, { error: "মন্তব্যে একাধিক বা সংক্ষিপ্ত লিংক গ্রহণ করা হচ্ছে না।" });
    }
    if (/(.)\1{11,}/u.test(comment) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(comment)) {
      return json(400, { error: "মন্তব্যে অস্বাভাবিক বা নিয়ন্ত্রণ-চিহ্ন রয়েছে।" });
    }

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent, error: duplicateError } = await db.from("comments")
      .select("author_name,comment_text")
      .eq("post_slug", slug).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(50);
    if (duplicateError) throw duplicateError;
    const duplicate = (recent || []).some((row) =>
      clean(row.author_name) === clean(name) && clean(row.comment_text) === clean(comment)
    );
    if (duplicate) return json(409, { error: "একই মন্তব্য ইতিমধ্যে পাঠানো হয়েছে।" });

    const { error: insertError } = await db.from("comments").insert({
      post_slug: slug, author_name: name, comment_text: comment
    });
    if (insertError) throw insertError;
    return json(200, { message: "আপনার মন্তব্য প্রকাশিত হয়েছে। ধন্যবাদ!" });
  } catch (error) {
    console.error("Comment submission error:", error);
    return json(500, { error: "মন্তব্য পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।" });
  }
});
