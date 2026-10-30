import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("SITE_URL") || "https://gmauvibbl-star.github.io/mostafa-auvi-website").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SHARE_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/share`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]!);
}

function page(status: number, title: string, description: string): Response {
  const safeTitle = esc(title);
  const safeDescription = esc(description);
  return new Response(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${safeTitle}</title><meta name="description" content="${safeDescription}"></head><body><h1>${safeTitle}</h1><p>${safeDescription}</p><a href="${SITE_URL}/">মূল ওয়েবসাইটে ফিরুন</a></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" }
  });
}

Deno.serve(async (req) => {
  const requestUrl = new URL(req.url);
  const slug = (requestUrl.searchParams.get("slug") || "").trim();
  if (!slug || slug.length > 180) return page(400, "লেখাটি পাওয়া যায়নি", "সঠিক লেখার লিংক ব্যবহার করুন।");

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: post, error } = await db.from("posts")
      .select("title,slug,language,excerpt,body,cover_image,published,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!post) return page(404, "লেখাটি পাওয়া যায়নি", "এই লেখা প্রকাশিত নয় অথবা লিংকটি সঠিক নয়।");

    const articleUrl = SITE_URL + "/read.html?slug=" + encodeURIComponent(post.slug);
    const title = String(post.title || "মোস্তফা অভি");
    const plainBody = String(post.excerpt || post.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const description = plainBody.slice(0, 240) || "মোস্তফা অভির সাহিত্যকর্ম ও ভাবনা।";
    const rawImage = String(post.cover_image || "").trim();
    const image = rawImage.startsWith("https://") || rawImage.startsWith("http://")
      ? rawImage
      : rawImage ? new URL(rawImage.replace(/^\//, ""), SITE_URL + "/").toString() : "";
    const isCrawler = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot/i.test(req.headers.get("user-agent") || "");

    // Real visitors receive an HTTP redirect; social crawlers receive Open Graph HTML.
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { "Location": articleUrl, "Cache-Control": "no-cache" }
      });
    }

    const imageTags = image
      ? `<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:image" content="${esc(image)}">`
      : "";
    const html = `<!doctype html>
<html lang="${post.language === "en" ? "en" : "bn"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Mostafa Auvi</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mostafa Auvi">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(SHARE_URL + "?slug=" + encodeURIComponent(post.slug))}">
<meta property="og:locale" content="${post.language === "en" ? "en_US" : "bn_BD"}">
${imageTags}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="canonical" href="${esc(articleUrl)}">

</head>
<body>
<p>${esc(title)}</p>
<p>${esc(description)}</p>
<a href="${esc(articleUrl)}">লেখাটি পড়ুন / Read the article</a>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Share preview error:", error);
    return page(500, "সাময়িক সমস্যা", "লেখার প্রিভিউ তৈরি করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।");
  }
});
