/**
 * Generate static, crawlable HTML pages for every published article.
 * These pages contain the article text in the initial HTML, so search
 * engines do not need JavaScript/Supabase to discover the writing.
 */
import fs from "node:fs/promises";
import path from "node:path";

const SITE = "https://gmauvibbl-star.github.io/mostafa-auvi-website";
const SUPABASE_URL = "https://voswrndbxrsaqfzwffhh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lsz4V4nlZIbrFKi43YhOEg_m_pf0E5I";
const OUT_DIR = "posts";
const PAGE_SIZE = 500;

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function text(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function dateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function articleUrl(post) {
  return `${SITE}/posts/${encodeURIComponent(post.slug)}.html`;
}
function langOf(post) {
  return post.language === "en" ? "en" : "bn";
}
function bodyHtml(post) {
  const body = String(post.body || "").trim();
  if (!body) return "<p>এই লেখার পূর্ণ পাঠ এখনো প্রকাশিত হয়নি।</p>";
  // Existing editor content is stored as HTML. Plain text is wrapped safely.
  return /<\/?[a-z][\s\S]*>/i.test(body) ? body : body
    .split(/\n\s*\n/)
    .map(p => `<p>${esc(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}
async function fetchPosts() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL("/rest/v1/posts", SUPABASE_URL);
    url.searchParams.set("select", "id,title,subtitle,excerpt,category,slug,body,language,cover_image,cover_image_url,group_id,published,created_at,updated_at,published_at");
    url.searchParams.set("published", "eq.true");
    url.searchParams.set("order", "published_at.asc.nullslast,slug.asc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` }
    });
    if (!response.ok) throw new Error(`Supabase posts request failed: ${response.status} ${await response.text()}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Supabase posts response was not an array.");
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows.filter(p => p && p.slug && (p.language === "bn" || p.language === "en"));
}
function render(post, alternates) {
  const lang = langOf(post);
  const title = String(post.title || "Mostafa Auvi");
  const description = text(post.excerpt || post.subtitle || post.body).slice(0, 155) || "Mostafa Auvi-এর প্রকাশিত লেখা।";
  const url = articleUrl(post);
  const published = dateOnly(post.published_at || post.created_at);
  const modified = dateOnly(post.updated_at || post.published_at || post.created_at);
  const cover = post.cover_image || post.cover_image_url || "";
  const isBn = lang === "bn";
  const category = text(post.category || "");
  const alternateBn = alternates?.bn || "";
  const alternateEn = alternates?.en || "";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Mostafa Auvi</title>
<meta name="author" content="Mostafa Auvi (মোস্তফা অভি)">
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
${alternateBn ? `<link rel="alternate" hreflang="bn" href="${esc(alternateBn)}">` : ""}
${alternateEn ? `<link rel="alternate" hreflang="en" href="${esc(alternateEn)}">` : ""}
${alternateBn && alternateEn ? `<link rel="alternate" hreflang="x-default" href="${esc(alternateBn)}">` : ""}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mostafa Auvi">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${isBn ? "bn_BD" : "en_US"}">
${cover ? `<meta property="og:image" content="${esc(cover)}">` : ""}
<meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${cover ? `<meta name="twitter:image" content="${esc(cover)}">` : ""}
<script type="application/ld+json">
${JSON.stringify({
  "@context":"https://schema.org",
  "@type":"Article",
  "headline":title,
  "description":description,
  "url":url,
  "mainEntityOfPage":{"@type":"WebPage","@id":url},
  "author":{"@type":"Person","name":"Mostafa Auvi","alternateName":"মোস্তফা অভি"},
  "publisher":{"@type":"Person","name":"Mostafa Auvi"},
  "datePublished":published || undefined,
  "dateModified":modified || undefined,
  "inLanguage":lang,
  ...(cover ? {"image":cover} : {}),
  ...(category ? {"articleSection":category} : {})
}, (k,v)=>v===undefined?undefined:v)}
</script>
<link rel="stylesheet" href="../assets/css/site-wide-theme.css?v=20261110-1">
<style>
:root{--teal:#0F3D3E;--gold:#B89248;--paper:#F4ECD8;--cream:#FFFEF7;--ink:#1A1410;--muted:#6B5A48;--blood:#8A1818}
*{box-sizing:border-box}body{margin:0;background:#5A6B3F;color:var(--ink);font-family:"Noto Serif Bengali","EB Garamond",serif}
.page{max-width:900px;margin:0 auto;background:var(--paper);min-height:100vh;padding:0 24px 60px}
header{padding:26px 0 20px;border-bottom:2px solid var(--teal)}
.brand{font-family:"Playfair Display",serif;font-size:28px;font-weight:800;color:var(--teal);text-decoration:none}.brand span{font-family:"Noto Serif Bengali",serif;font-size:14px;margin-left:8px}
nav{margin-top:14px;font-size:14px}nav a{color:var(--teal);text-decoration:none;margin-right:18px}
main{background:var(--cream);max-width:800px;margin:28px auto 0;padding:42px 48px;box-shadow:0 5px 22px #0001}
.category{font-size:12px;color:var(--gold);letter-spacing:.12em;margin-bottom:16px}
h1{font-size:clamp(28px,4vw,42px);line-height:1.35;margin:0 0 12px;color:var(--teal)}
.subtitle{font-style:italic;color:var(--muted);font-size:18px;line-height:1.7;margin-bottom:16px}
.meta{font-family:"EB Garamond",serif;color:var(--muted);font-size:14px;margin-bottom:28px}
.cover{display:block;width:100%;height:auto;max-height:460px;object-fit:cover;margin:0 0 28px}
.article-body{font-size:18px;line-height:2;text-align:justify}
.article-body p{margin:0 0 1.1em}.article-body h2,.article-body h3{color:var(--teal);line-height:1.4;margin:1.6em 0 .7em}.article-body img{max-width:100%;height:auto}
.back{margin-top:36px;padding-top:18px;border-top:1px solid #C8B898}.back a{color:var(--teal)}
@media(max-width:640px){.page{padding:0 12px 40px}main{padding:26px 20px}.article-body{font-size:16px;line-height:1.9}.subtitle{font-size:16px}}
</style>
</head>
<body>
<div class="page">
<header>
<a class="brand" href="../">MOSTAFA AUVI <span>মোস্তফা অভি</span></a>
<nav aria-label="প্রধান নেভিগেশন">
<a href="../">প্রচ্ছদ</a><a href="../posts.html">প্রকাশিত লেখা</a><a href="../about.html">লেখক</a>
</nav>
</header>
<main>
<div class="category">${esc(category || (isBn ? "প্রকাশিত লেখা" : "Published Writing"))}</div>
<h1>${esc(title)}</h1>
${post.subtitle ? `<div class="subtitle">${esc(post.subtitle)}</div>` : ""}
<div class="meta">Mostafa Auvi (মোস্তফা অভি)${published ? ` · ${esc(published)}` : ""}</div>
${cover ? `<img class="cover" src="${esc(cover)}" alt="${esc(title)}" loading="eager">` : ""}
<article class="article-body">${bodyHtml(post)}</article>
<div class="back"><a href="../posts.html">← ${isBn ? "প্রকাশিত লেখায় ফিরুন" : "Back to published writing"}</a></div>
</main>
</div>
</body>
</html>`;
}
const posts = await fetchPosts();
if (!posts.length) throw new Error("No published posts returned; refusing to delete or replace static article pages.");
await fs.mkdir(OUT_DIR, { recursive: true });
const groups = new Map();
for (const p of posts) {
  if (!p.group_id) continue;
  if (!groups.has(p.group_id)) groups.set(p.group_id, {});
  groups.get(p.group_id)[langOf(p)] = articleUrl(p);
}
const keep = new Set();
for (const post of posts) {
  const filename = path.join(OUT_DIR, `${post.slug}.html`);
  const html = render(post, post.group_id ? groups.get(post.group_id) : null);
  await fs.writeFile(filename, html, "utf8");
  keep.add(path.resolve(filename));
}
const entries = await fs.readdir(OUT_DIR, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
  const full = path.resolve(OUT_DIR, entry.name);
  if (!keep.has(full)) await fs.unlink(full);
}
console.log(`Generated ${posts.length} crawlable static article pages.`);
