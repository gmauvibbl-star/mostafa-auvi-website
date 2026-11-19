/* reader-modern.js (2026-11-20)
   read.html-এর পাঠ-পাতায় যোগ করে: অক্ষরের মাপ বদলানোর বোতাম, পড়ার অগ্রগতির বার,
   পড়তে কত মিনিট লাগবে, এবং আগের/পরের লেখার লিংক।
   read.html-এর নিজস্ব স্ক্রিপ্ট বদলাতে হয় না; লেখা আঁকা হলে এটি নিজে থেকে কাজ করে। */
(function () {
  'use strict';

  var SIZE_KEY = 'mauvi_reader_scale';
  var MIN = 0.85, MAX = 1.5, STEP = 0.1;
  var root = document.documentElement;
  var articleEl = document.getElementById('article');
  if (!articleEl) return;

  var params = new URLSearchParams(location.search);
  var slug = params.get('slug') || '';

  /* ---------- অক্ষরের মাপ মনে রাখা ---------- */
  function loadScale() {
    try {
      var v = parseFloat(localStorage.getItem(SIZE_KEY));
      if (v >= MIN && v <= MAX) return v;
    } catch (e) {}
    return 1;
  }
  function saveScale(v) {
    try { localStorage.setItem(SIZE_KEY, String(v)); } catch (e) {}
  }
  var scale = loadScale();
  root.style.setProperty('--rm-scale', scale);

  function isEn() { return root.lang === 'en'; }
  function toBn(n) { return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); }

  /* ---------- পড়ার অগ্রগতির বার ---------- */
  var bar = document.createElement('div');
  bar.id = 'rmProgress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  function onScroll() {
    if (!document.querySelector('#article .a4-body')) { bar.style.width = '0'; return; }
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---------- লেখা আঁকা হলে যা যা যোগ হবে ---------- */
  function enhance() {
    var page = articleEl.querySelector('.a4-page');
    if (!page || page.getAttribute('data-rm') === '1') return;
    var body = page.querySelector('.a4-body');
    if (!body) return;
    page.setAttribute('data-rm', '1');
    var en = isEn();

    /* পড়তে কত মিনিট */
    var words = (body.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    var mins = Math.max(1, Math.round(words / (en ? 220 : 180)));
    var meta = page.querySelector('.a4-meta');
    if (meta && words > 0) {
      var sep = document.createElement('span');
      sep.className = 'meta-sep';
      sep.textContent = '·';
      var t = document.createElement('span');
      t.textContent = en ? mins + ' min read' : toBn(mins) + ' মিনিটের পাঠ';
      meta.appendChild(sep);
      meta.appendChild(t);
    }

    /* অক্ষরের মাপের বোতাম (কভার ছবির পরে, লেখার আগে) */
    var tools = document.createElement('div');
    tools.className = 'rm-bar';
    var label = document.createElement('span');
    label.className = 'rm-label';
    label.textContent = en ? 'Text size' : 'অক্ষরের মাপ';
    var minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = en ? 'A−' : 'অ−';
    minus.setAttribute('aria-label', en ? 'Smaller text' : 'অক্ষর ছোট করুন');
    var plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = en ? 'A+' : 'অ+';
    plus.setAttribute('aria-label', en ? 'Larger text' : 'অক্ষর বড় করুন');
    function change(d) {
      scale = Math.round(Math.min(MAX, Math.max(MIN, scale + d)) * 100) / 100;
      root.style.setProperty('--rm-scale', scale);
      saveScale(scale);
      onScroll();
    }
    minus.addEventListener('click', function () { change(-STEP); });
    plus.addEventListener('click', function () { change(STEP); });
    tools.appendChild(label);
    tools.appendChild(minus);
    tools.appendChild(plus);
    body.parentNode.insertBefore(tools, body);

    onScroll();
    addPrevNext(page, en);
  }

  /* ---------- আগের / পরের লেখা ---------- */
  function addPrevNext(page, en) {
    /* চন্দ্রদ্বীপের স্থির পাতায় এবং খসড়া প্রিভিউতে এটি লাগে না */
    if (!slug || /^chandradwip-/.test(slug) || params.get('preview') === '1') return;
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') return;
    if (!window.supabase || !window.supabase.createClient) return;

    var lang = en ? 'en' : 'bn';
    var sb;
    try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { return; }

    sb.from('posts')
      .select('slug,title,published_at,id')
      .eq('published', true)
      .eq('language', lang)
      .neq('category', 'chandradwip')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(300)
      .then(function (res) {
        if (!res || res.error || !res.data) return;
        var list = res.data;
        var i = -1;
        for (var k = 0; k < list.length; k++) { if (list[k].slug === slug) { i = k; break; } }
        if (i < 0) return;
        var newer = i > 0 ? list[i - 1] : null;
        var older = i < list.length - 1 ? list[i + 1] : null;
        if (!newer && !older) return;
        if (!page.isConnected) return;

        function link(post, cls, dir) {
          if (!post) {
            var empty = document.createElement('span');
            empty.className = 'rm-empty';
            return empty;
          }
          var a = document.createElement('a');
          a.className = cls;
          a.href = 'read.html?slug=' + encodeURIComponent(post.slug) + (en ? '&lang=en' : '');
          var d = document.createElement('span');
          d.className = 'rm-dir';
          d.textContent = dir;
          var s = document.createElement('strong');
          s.textContent = post.title || '';
          a.appendChild(d);
          a.appendChild(s);
          return a;
        }

        var wrap = document.createElement('nav');
        wrap.className = 'rm-pn';
        wrap.setAttribute('aria-label', en ? 'More writing' : 'আরও লেখা');
        wrap.appendChild(link(older, 'prev', en ? '← Previous' : '← আগের লেখা'));
        wrap.appendChild(link(newer, 'next', en ? 'Next →' : 'পরের লেখা →'));
        var tags = page.querySelector('.a4-tags');
        if (tags && tags.nextSibling) page.insertBefore(wrap, tags.nextSibling);
        else page.appendChild(wrap);
      })
      .catch(function () {});
  }

  /* ---------- লেখা আঁকার অপেক্ষা ---------- */
  var observer = new MutationObserver(function () { enhance(); onScroll(); });
  observer.observe(articleEl, { childList: true });
  enhance();
  onScroll();
})();
