/* ==========================================================================
   latest-writings-patch.js
   Replace the whole function initLatestWritings() in assets/js/main.js
   with the function below. Behaviour changes:
     - Shows cover image when one exists; otherwise a styled fallback that
       carries the category name (so no card is blank).
     - Removes duplicate posts (same slug or same title) before rendering.
     - Excludes the Chandradwip serial chapters from "recent" so long-running
       series do not crowd out new articles (set SHOW_SERIES = true to allow).
     - Fetches extra rows so that after filtering there are still 3 cards.
   ========================================================================== */

function initLatestWritings() {
  var section = document.querySelector(".latest-writings");
  var grid = document.getElementById("latestGrid");
  if (!section || !grid) return;

  var SUPABASE_URL =
    (window.SITE_CONFIG && window.SITE_CONFIG.SUPABASE_URL) ||
    "https://voswrndbxrsaqfzwffhh.supabase.co";
  var SUPABASE_ANON_KEY =
    (window.SITE_CONFIG && window.SITE_CONFIG.SUPABASE_ANON_KEY) ||
    "sb_publishable_lsz4V4nlZIbrFKi43YhOEg_m_pf0E5I";
  if (!SUPABASE_URL.startsWith("https://")) return;

  var LIMIT = 3;
  var FETCH_LIMIT = 12;          // fetch more, filter down to LIMIT
  var SHOW_SERIES = false;       // true => include chandradwip series chapters

  var CATEGORY_LABELS = {
    kothasahitya: "কথাসাহিত্য",
    "probandho-sahityasamalochona": "প্রবন্ধ ও সাহিত্যসমালোচনা",
    "ain-oadalot": "আইন ও আদালত",
    "banking-o-orthoniti": "ব্যাংকিং ও অর্থনীতি",
    "prokashona-o-pdf": "প্রকাশনা",
    bhromonkahini: "ভ্রমণ ও অনুবাদ সাহিত্য",
  };
  var SERIES_KEYS = ["chandradwip", "চন্দ্রদ্বীপ"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("bn-BD", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch (e) { return ""; }
  }
  function catKey(c) {
    return String(c == null ? "" : c).trim().toLowerCase();
  }
  function catLabel(c) {
    var k = catKey(c);
    if (SERIES_KEYS.indexOf(k) !== -1) return "ধারাবাহিক";
    return CATEGORY_LABELS[k] || (c || "");
  }
  function isSeries(c) {
    return SERIES_KEYS.indexOf(catKey(c)) !== -1;
  }

  function prepare(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var seenSlug = {};
    var seenTitle = {};
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var p = rows[i];
      if (!p || !p.slug) continue;
      if (!SHOW_SERIES && isSeries(p.category)) continue;
      var t = String(p.title || "").trim();
      if (seenSlug[p.slug] || (t && seenTitle[t])) continue;
      seenSlug[p.slug] = true;
      if (t) seenTitle[t] = true;
      out.push(p);
      if (out.length === LIMIT) break;
    }
    return out;
  }

  function render(rows) {
    var list = prepare(rows);
    if (!list.length) {
      grid.innerHTML =
        '<div class="latest-loading">কোনো সাম্প্রতিক লেখা পাওয়া যায়নি।</div>';
      section.hidden = false;
      return;
    }
    grid.innerHTML = list.map(function (p) {
      var coverUrl = p.cover_image || p.cover_image_url || "";
      var cover = coverUrl
        ? '<img class="lc-cover" src="' + esc(coverUrl) + '" alt="' +
          esc(p.title || "") + '" loading="lazy" width="400" height="225">'
        : '<div class="lc-cover-fallback" aria-hidden="true">❦</div>';

      var excerpt = String(p.excerpt || "").replace(/\s+/g, " ").trim();
      if (excerpt.length > 140) excerpt = excerpt.slice(0, 140) + "…";

      return '<a class="latest-card" href="./read.html?slug=' +
        encodeURIComponent(p.slug) + '&lang=bn">' + cover +
        '<div class="lc-body">' +
        '<span class="lc-badge">' + esc(catLabel(p.category)) + "</span>" +
        '<h3 class="lc-title">' + esc(p.title || "(শিরোনামহীন)") + "</h3>" +
        (excerpt ? '<p class="lc-excerpt">' + esc(excerpt) + "</p>" : "") +
        (p.published_at
          ? '<span class="lc-date">' + esc(fmtDate(p.published_at)) + "</span>"
          : "") +
        "</div></a>";
    }).join("");
    section.hidden = false;
  }

  function showLoadError() {
    grid.innerHTML =
      '<div class="latest-loading">সাম্প্রতিক লেখা এখন লোড করা যাচ্ছে না। আবার চেষ্টা করুন।</div>';
    section.hidden = false;
  }

  var columns =
    "slug,title,excerpt,cover_image,cover_image_url,category,published_at,language";

  function restFallback() {
    var url = SUPABASE_URL + "/rest/v1/posts?select=" + columns +
      "&published=eq.true&language=eq.bn" +
      "&order=published_at.desc.nullslast&limit=" + FETCH_LIMIT;
    return fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      cache: "no-store",
    }).then(function (res) {
      if (!res.ok) throw new Error("REST " + res.status);
      return res.json();
    });
  }

  try {
    if (window.supabase && window.supabase.createClient) {
      var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      sb.from("posts")
        .select(columns)
        .eq("published", true)
        .eq("language", "bn")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(FETCH_LIMIT)
        .then(function (res) {
          if (res && !res.error) render(res.data);
          else restFallback().then(render).catch(showLoadError);
        })
        .catch(function () {
          restFallback().then(render).catch(showLoadError);
        });
    } else {
      restFallback().then(render).catch(showLoadError);
    }
  } catch (e) {
    restFallback().then(render).catch(showLoadError);
  }
}
