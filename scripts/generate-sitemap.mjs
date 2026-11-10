/**
 * Generate a Google sitemap from the site's public, published Supabase posts.
 * Runs in GitHub Actions; never exposes draft or private content.
 */
const SITE = "https://gmauvibbl-star.github.io/mostafa-auvi-website";
const SUPABASE_URL = "https://voswrndbxrsaqfzwffhh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lsz4V4nlZIbrFKi43YhOEg_m_pf0E5I";
const PAGE_SIZE = 1000;

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function dateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function articleUrl(post) {
  const url = new URL("read.html", SITE + "/");
  url.searchParams.set("slug", post.slug);
  if (post.language === "en") url.searchParams.set("lang", "en");
  return url.toString();
}

async function fetchPublishedPosts() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    // This narrowly scoped SECURITY DEFINER RPC returns only public sitemap
    // fields for published posts. It avoids granting anon access to admin_users.
    const url = new URL("/rest/v1/rpc/get_sitemap_published_posts", SUPABASE_URL);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        "Range-Unit": "items",
        Range: `${offset}-${offset + PAGE_SIZE - 1}`
      },
      body: "{}"
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Supabase sitemap RPC failed (${response.status}). ` +
        `Confirm migration 20261105_sitemap_public_rpc.sql has been run in Supabase SQL Editor. ${detail.slice(0, 500)}`
      );
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Supabase sitemap RPC returned an unexpected response.");
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows.filter(p => p && typeof p.slug === "string" && p.slug.trim()
    && (p.language === "bn" || p.language === "en"));
}

function buildSitemap(posts) {
  const staticUrls = [
    SITE + "/",
    SITE + "/index-en.html",
    SITE + "/posts.html",
    SITE + "/about.html",
    SITE + "/about-en.html",
    SITE + "/privacy.html",
    SITE + "/privacy-en.html"
  ];
  const staticEntries = staticUrls.map(loc => ({ loc }));
  const articleEntries = posts.map(post => ({
    loc: articleUrl(post),
    lastmod: dateOnly(post.updated_at || post.published_at),
    post
  }));

  // Add reciprocal language alternates only when both translations share group_id.
  const groups = new Map();
  for (const entry of articleEntries) {
    const group = entry.post.group_id;
    if (!group) continue;
    if (!groups.has(group)) groups.set(group, {});
    groups.get(group)[entry.post.language] = entry.loc;
  }
  for (const entry of articleEntries) {
    const pair = entry.post.group_id ? groups.get(entry.post.group_id) : null;
    entry.alternates = pair && pair.bn && pair.en ? pair : null;
  }

  // These are static Chandradwip reading pages handled directly by read.html.
  const staticArticles = [
    "chandradwip-writing",
    "chandradwip-characters",
    "chandradwip-settlement"
  ].map(slug => {
    const url = new URL("read.html", SITE + "/");
    url.searchParams.set("slug", slug);
    return { loc: url.toString() };
  });

  const entries = [...staticEntries, ...staticArticles, ...articleEntries];
  const seen = new Set();
  const unique = entries.filter(entry => {
    if (seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });

  const body = unique.map(entry => {
    const lines = ["  <url>", `    <loc>${xmlEscape(entry.loc)}</loc>`];
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    if (entry.alternates) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="bn" href="${xmlEscape(entry.alternates.bn)}" />`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(entry.alternates.en)}" />`);
    }
    lines.push("  </url>");
    return lines.join("\n");
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

const posts = await fetchPublishedPosts();
if (posts.length === 0) {
  throw new Error(
    "Supabase returned zero published posts. Refusing to overwrite sitemap.xml; " +
    "check the sitemap RPC migration and published rows."
  );
}
const xml = buildSitemap(posts);
await import("node:fs/promises").then(fs => fs.writeFile("sitemap.xml", xml, "utf8"));
console.log(`Generated sitemap.xml with ${7 + 3 + posts.length} URLs (${posts.length} published bilingual post records).`);
