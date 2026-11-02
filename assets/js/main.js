/* ============================================================
 *  main.js  —  General page behaviour (modifiable)
 *  -----------------------------------------------------------
 *  Contains:
 *    1. Share / copy-link / toast  (carried over verbatim from the
 *       original share <script>, lines 2074-2165 — same public API:
 *       window.sharePage, window.copyLink)
 *    2. NEW: mobile nav toggle (accessible disclosure)
 *    3. NEW: back-to-top button
 *    4. NEW: dynamic utility-bar date (Bengali locale)
 *    5. NEW: aria-current on active nav link
 *    6. NEW: focus-trap wrapper for the login modal — does NOT touch
 *       auth.js; it only observes the .open class on #loginModalOverlay
 *    7. NEW: graceful placeholder for the Chandradwip extra image
 *
 *  This file does NOT modify the hero banner, the header border, or
 *  the author dashboard logic (auth.js handles all auth).
 * ============================================================ */
(function () {
  "use strict";

  /* ====================================================================
   *  1. SHARE / COPY-LINK / TOAST  (carried over verbatim)
   * ==================================================================== */
  var pageUrl = window.location.href.split("?")[0].split("#")[0];
  var pageTitle = document.title || "Mostafa Auvi — Fiction Writer & Literary Critic";
  var pageText = "মোস্তফা অভি — Fiction Writer & Literary Critic. ইতিহাসের ভেতর জীবন, জীবনের ভেতর গল্প।";

  window.sharePage = function (platform) {
    var url = "";
    var encodedUrl = encodeURIComponent(pageUrl);
    var encodedTitle = encodeURIComponent(pageTitle);
    var encodedText = encodeURIComponent(pageText);
    switch (platform) {
      case "facebook": url = "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl; break;
      case "twitter":  url = "https://twitter.com/intent/tweet?url=" + encodedUrl + "&text=" + encodedText; break;
      case "whatsapp": url = "https://wa.me/?text=" + encodeURIComponent(pageText + " " + pageUrl); break;
      case "telegram": url = "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedText; break;
      case "linkedin": url = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl; break;
      case "email":    url = "mailto:?subject=" + encodedTitle + "&body=" + encodeURIComponent(pageText + "\n\n" + pageUrl); break;
      default: return false;
    }
    if (platform === "email") {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "width=600,height=500,scrollbars=yes,resizable=yes");
    }
    return false;
  };

  window.copyLink = function () {
    var pageUrlCopy = window.location.href.split("?")[0].split("#")[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pageUrlCopy).then(function () {
        showToast("লিংক কপি হয়েছে: " + pageUrlCopy);
      }).catch(function () {
        fallbackCopy(pageUrlCopy);
      });
    } else {
      fallbackCopy(pageUrlCopy);
    }
    return false;
  };

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("লিংক কপি হয়েছে: " + text);
    } catch (err) {
      showToast("কপি করতে সমস্যা হয়েছে। অনুগ্রহ করে ম্যানুয়ালি কপি করুন।");
    }
    document.body.removeChild(textarea);
  }

  function showToast(message) {
    var existing = document.getElementById("share-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.id = "share-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    toast.style.cssText =
      "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);" +
      "background:#0F3D3E;color:#f4ead2;padding:14px 22px;border-radius:8px;" +
      'font-family:"Noto Serif Bengali",serif;font-size:14px;font-weight:600;' +
      "z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,0.3);border:1.5px solid #b89248;" +
      "max-width:90%;text-align:center;";
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  }

  /* ====================================================================
   *  2. MOBILE NAV TOGGLE  (accessible disclosure)
   * ==================================================================== */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.querySelector(".nav ul");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close menu when a link is clicked (mobile)
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    // Reset on resize to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ====================================================================
   *  3. BACK-TO-TOP
   * ==================================================================== */
  function initBackToTop() {
    var btn = document.querySelector(".back-to-top");
    if (!btn) return;
    function onScroll() {
      if (window.scrollY > 600) {
        btn.classList.add("is-visible");
      } else {
        btn.classList.remove("is-visible");
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    onScroll();
  }

  /* ====================================================================
   *  4. DYNAMIC UTILITY-BAR DATE (Bengali locale)
   * ==================================================================== */
  function initDate() {
    var el = document.querySelector(".utility-bar .date");
    if (!el) return;
    try {
      var now = new Date();
      var formatted = now.toLocaleDateString("bn-BD", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      el.textContent = formatted;
    } catch (e) {
      // keep the static fallback already in the HTML
    }
  }

  /* ====================================================================
   *  5. aria-current on active nav link
   * ==================================================================== */
  function initActiveNav() {
    var here = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav ul li a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href === here || (here === "index.html" && (href === "index.html" || href === "./"))) {
        a.setAttribute("aria-current", "page");
        var li = a.closest("li");
        if (li) li.classList.add("active");
      }
    });
  }

  /* ====================================================================
   *  6. FOCUS-TRAP WRAPPER for the login modal
   *     Does NOT modify auth.js. It only observes whether the overlay
   *     has the .open class (set by auth.js) and traps Tab inside it.
   * ==================================================================== */
  function initModalFocusTrap() {
    var overlay = document.getElementById("loginModalOverlay");
    if (!overlay) return;
    var focusable = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable() {
      return Array.prototype.slice.call(overlay.querySelectorAll(focusable)).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      if (e.key !== "Tab") return;
      var items = getFocusable();
      if (!items.length) { e.preventDefault(); return; }
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // Move focus into the modal when it opens (auth.js already focuses email;
    // this is a fallback in case the timing shifts).
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class" && overlay.classList.contains("open")) {
          var items = getFocusable();
          if (items.length) {
            // don't steal focus if auth.js already focused the email
            if (document.activeElement === document.body) items[0].focus();
          }
        }
      });
    });
    observer.observe(overlay, { attributes: true });
  }

  /* ====================================================================
   *  7. CHANDRADWIP EXTRA IMAGE — graceful placeholder
   *     If assets/img/chandradwip-extra.jpg is missing, the <figure>
   *     shows a placeholder note. When the owner drops the real image
   *     at that path, it loads and the placeholder disappears.
   * ==================================================================== */
  function initChandradwipExtra() {
    var fig = document.querySelector(".chandradwip-extra");
    if (!fig) return;
    var img = fig.querySelector("img");
    if (!img) return;
    function showPlaceholder() {
      fig.classList.add("is-placeholder");
    }
    function hidePlaceholder() {
      fig.classList.remove("is-placeholder");
      var note = fig.querySelector(".placeholder-note");
      if (note) note.hidden = true;
    }
    if (img.complete) {
      if (img.naturalWidth === 0) showPlaceholder();
    }
    img.addEventListener("error", showPlaceholder);
    img.addEventListener("load", function () {
      if (img.naturalWidth > 0) hidePlaceholder();
    });
  }

  /* ====================================================================
   *  8. LATEST WRITINGS — auto-display latest published articles
   *     Fetches the 3 most recent published posts (Bengali) from the same
   *     Supabase project used by auth.js / posts.html. Reveals the
   *     <section class="latest-writings"> only when cards render.
   *     Never shows empty/unpublished content. If Supabase is unreachable,
   *     the section stays hidden (graceful — no broken block on the homepage).
   * ==================================================================== */
  function initLatestWritings() {
    var section = document.querySelector(".latest-writings");
    var grid = document.getElementById("latestGrid");
    if (!section || !grid) return;
    // Same publishable config as auth.js / posts.html (safe for client-side)
    var SUPABASE_URL = "https://voswrndbxrsaqfzwffhh.supabase.co";
    var SUPABASE_ANON_KEY = "sb_publishable_lsz4V4nlZIbrFKi43YhOEg_m_pf0E5I";
    if (!window.supabase || !SUPABASE_URL.startsWith("https://")) return;

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
    function catLabel(c) {
      var map = {
        kothasahitya: "কথাসাহিত্য",
        "probandho-sahityasamalochona": "প্রবন্ধ ও সাহিত্যসমালোচনা",
        "ain-oadalot": "আইন-আদালত",
        "banking-o-orthoniti": "ব্যাংকিং ও অর্থনীতি",
        "prokashona-o-pdf": "প্রকাশনা",
        bhromonkahini: "ভ্রমণকাহিনি",
        chandradwip: "চন্দ্রদ্বীপ",
        "byaktigoto-onubhuti": "ব্যক্তিগত অনুভূতি",
      };
      return map[c] || c || "";
    }

    try {
      var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      sb.from("posts")
        .select("slug,title,excerpt,cover_image,category,published_at,language")
        .eq("published", true)
        .eq("language", "bn")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3)
        .then(function (res) {
          var rows = (res && res.data) || [];
          if (!rows.length) return; // leave section hidden
          grid.innerHTML = rows.map(function (p) {
            var cover = p.cover_image
              ? '<img class="lc-cover" src="' + esc(p.cover_image) + '" alt="' + esc(p.title || "") + '" loading="lazy" width="400" height="225">'
              : '<div class="lc-cover-fallback" aria-hidden="true">❦</div>';
            var excerpt = String(p.excerpt || "").replace(/\s+/g, " ").trim();
            if (excerpt.length > 140) excerpt = excerpt.slice(0, 140) + "…";
            return '<a class="latest-card" href="./read.html?slug=' +
              encodeURIComponent(p.slug) + '&lang=bn">' + cover +
              '<div class="lc-body">' +
              '<span class="lc-badge">' + esc(catLabel(p.category)) + '</span>' +
              '<h3 class="lc-title">' + esc(p.title || "(শিরোনামহীন)") + '</h3>' +
              (excerpt ? '<p class="lc-excerpt">' + esc(excerpt) + '</p>' : '') +
              (p.published_at ? '<span class="lc-date">' + esc(fmtDate(p.published_at)) + '</span>' : '') +
              '</div></a>';
          }).join("");
          section.hidden = false;
        })
        .catch(function () { /* leave section hidden */ });
    } catch (e) { /* leave section hidden */ }
  }

  /* ====================================================================
   *  9. CHANDRADWIP SUB-SECTION ACCORDIONS
   *     #chandradwip-writing, #chandradwip-characters, #chandradwip-settlement
   *     Each panel toggles open/closed when its header button is clicked.
   *     When an anchor link (e.g. index.html#chandradwip-characters) is
   *     followed, the matching panel is auto-opened and scrolled to.
   * ==================================================================== */
  function initChandradwipPanels() {
    var panels = document.querySelectorAll(".cwip-panel");
    if (!panels.length) return;

    panels.forEach(function (panel) {
      var btn = panel.querySelector(".cwip-panel-toggle");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        if (expanded) {
          btn.setAttribute("aria-expanded", "false");
          panel.classList.add("collapsed");
        } else {
          btn.setAttribute("aria-expanded", "true");
          panel.classList.remove("collapsed");
        }
      });
    });

    // If page was loaded with a #chandradwip-* hash, make sure that
    // panel is open (in case CSS or future logic hides it).
    var hash = window.location.hash;
    if (hash) {
      var target = document.getElementById(hash.slice(1));
      if (target && target.classList.contains("cwip-panel")) {
        var tBtn = target.querySelector(".cwip-panel-toggle");
        if (tBtn) {
          tBtn.setAttribute("aria-expanded", "true");
          target.classList.remove("collapsed");
        }
      }
    }
  }

  /* ====================================================================
   *  INIT
   * ==================================================================== */
  function init() {
    initNavToggle();
    initBackToTop();
    initDate();
    initActiveNav();
    initModalFocusTrap();
    initChandradwipExtra();
    initLatestWritings();
    initChandradwipPanels();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
