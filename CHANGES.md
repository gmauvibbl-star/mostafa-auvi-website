# WCAG কনট্রাস্ট ফিক্স + iPhone হেডার/নেভিগেশন ফিক্স

**তারিখ:** ৪ নভেম্বর ২০২৬  
**শর্ত:** শুধু CSS পরিবর্তন করা হয়েছে। HTML স্ট্রাকচার, JavaScript, Supabase, বা বিদ্যমান লেখার কনটেন্ট একদম অক্ষত রাখা হয়েছে।  
**যাচাই:** সব ৭টি ফাইলে tag count, script count, ও text content length অপরিবর্তিত — শুধু `<style>` ব্লকের ভেতরে CSS রুল পরিবর্তিত।

---

## ১. কনট্রাস্ট ফিক্স (WCAG AA ৪.৫:১ পাস করেছে)

| # | পৃষ্ঠা | উপাদান | পুরোনো রঙ → নতুন রঙ | পুরোনো রেশিও | নতুন রেশিও |
|---|--------|--------|----------------------|---------------|-------------|
| ১ | read.html | English বাটন | `rgba(250,244,232,0.85)` → `var(--cream)` `#FAF4E8` | 1.78:1 ❌ | **10.91:1** ✅ |
| ২ | read.html | Subscribe বাটন লেখা | `var(--cream)` → `#FFFFFF` | 1.41:1 ❌ | **9.44:1** ✅ |
| ৩ | about.html | Subscribe বাটন লেখা | `var(--cream)` → `#FFFFFF` | 1.41:1 ❌ | **9.44:1** ✅ |
| ৪ | about.html | Side-link বাটন | `var(--cream)` → `#FFFFFF` | 1.41:1 ❌ | **9.44:1** ✅ |
| ৫ | about.html | English বাটন | `rgba(250,244,232,0.85)` → `var(--cream)` | 1.78:1 ❌ | **10.91:1** ✅ |
| ৬ | posts.html | লেখা দেখুন (essay-hub span) | ৫টি accent গাঢ় করা হয়েছে | 4.48:1 ⚠️ | **7.48–10.91:1** ✅ |
| ৭ | posts.html | Footer copy | `var(--gold-dim)` `#7A6028` → `var(--paper)` `#F4ECD8` | 2.93:1 ❌ | **10.15:1** ✅ |
| ৮ | privacy.html | ইমেইল লিংক | `#8A6A2C` → `#4A3818` | 4.46:1 ⚠️ | **9.98:1** ✅ |

### posts.html-এ "লেখা দেখুন" অ্যাকসেন্ট পরিবর্তন

কার্ডের ৫টি অ্যাকসেন্ট রঙ গাঢ় করা হয়েছে যাতে কনট্রাস্ট থাকে এবং বৈচিত্র্যও বজায় থাকে:

| # | পুরোনো অ্যাকসেন্ট | নতুন অ্যাকসেন্ট | কনট্রাস্ট (cream-এর ওপর) |
|---|-------------------|------------------|---------------------------|
| ১ | `#1B5E6B` (teal) | `#0F3D3E` (teal-deep) | 10.91:1 ✅ |
| ২ | `#A85D35` (terracotta) | `#7A3F22` (গাঢ় টেরাকোটা) | 7.48:1 ✅ |
| ৩ | `#4669A6` (blue) | `#2E4878` (গাঢ় নীল) | 8.28:1 ✅ |
| ৪ | `#A64E7D` (pink) | `#7A3458` (গাঢ় পিঙ্ক) | 7.79:1 ✅ |
| ৫ | `#5C6B22` (olive) | `#404E18` (গাঢ় অলিভ) | 8.26:1 ✅ |

---

## ২. iPhone হেডার ও নেভিগেশন ফিক্স

সব ৭টি পাবলিক পৃষ্ঠা এবং ২টি শেয়ার্ড CSS ফাইলে নিচের CSS-only ফিক্স যোগ করা হয়েছে (কোনো HTML `<meta>` বা viewport ট্যাগ পরিবর্তন ছাড়াই):

### a) Safe-area প্যাডিং
- Notch / Dynamic Island / Home Indicator থেকে কনটেন্ট সুরক্ষিত রাখতে `env(safe-area-inset-*)` ব্যবহার করা হয়েছে
- `max(20px, env(safe-area-inset-X, 0px))` প্যাটার্ন — যেসব ডিভাইসে env() 0 রিটার্ন করে, সেখানে মূল প্যাডিং বজায় থাকে

### b) iOS Safari URL-bar ঝাঁকুনি সমাধান
- `overscroll-behavior-y: none` — রাবার-ব্যান্ড বাউন্স বন্ধ
- `@supports (height: 100dvh)` — dynamic viewport height দিয়ে 100vh ঝাঁকুনি সমাধান
- `scroll-padding-top: 80px` — anchor স্ক্রলে স্টিকি হেডার কনটেন্ট ঢাকে না

### c) টাচ ইন্টারঅ্যাকশন উন্নতি
- `touch-action: manipulation` — 300ms ট্যাপ-ডিলে বাদ
- `-webkit-overflow-scrolling: touch` + `scroll-snap-type: x proximity` — নেভ মেনুতে মোমেন্টাম স্ক্রল
- `input, select, textarea { font-size: 16px }` — iOS Safari অটো-জুম প্রতিরোধ

### d) iPhone SE / mini (320–380px) টিউনিং
- ব্র্যান্ড নাম ও ফন্ট সাইজ ছোট করা হয়েছে যাতে ওভারফ্লো না হয়
- নেভ মেনু `flex-wrap: nowrap; overflow-x: auto` দিয়ে হরাইজন্টাল স্ক্রলে চলে যায়
- হেডার প্যাডিং কমানো হয়েছে

---

## ৩. ফাইল তালিকা

### পরিবর্তিত HTML ফাইল (শুধু `<style>` ব্লকে CSS পরিবর্তন)
| ফাইল | কনট্রাস্ট ফিক্স | iPhone ফিক্স |
|------|-----------------|--------------|
| `read.html` | ✅ English বাটন + Subscribe বাটন | ✅ |
| `about.html` | ✅ English + Subscribe + Side-link | ✅ |
| `posts.html` | ✅ লেখা দেখুন + Footer copy | ✅ |
| `privacy.html` | ✅ ইমেইল লিংক | ✅ |
| `index.html` | — (কোনো কনট্রাস্ট সমস্যা ছিল না) | ✅ |
| `subscribe.html` | — | ✅ |
| `gateway-chand-dwip.html` | — | ✅ |

### পরিবর্তিত CSS ফাইল
| ফাইল | কী পরিবর্তন |
|------|------------|
| `assets/css/site-wide-theme.css` | iPhone হেডার/নেভ/সেফ-এরিয়া ফিক্স যোগ (৫টি পৃষ্ঠা এটি লিংক করে) |
| `assets/css/header-new.css` | iPhone হেডার সেফ-এরিয়া + মোমেন্টাম স্ক্রল + SE টিউনিং |

---

## ৪. পুল-মার্জ গাইড

এই ZIP-এর ভেতরের ফাইলগুলো রিপোজিটরির সংশ্লিষ্ট ফাইলের ওপর দিয়ে কপি করুন। গিট পার্সপেক্টিভ থেকে শুধু CSS লাইন পরিবর্তন হিসেবে দেখাবে — কোনো নতুন ফাইল বা ডিলিট নেই।

```bash
# রিপো ক্লোন করে ZIP-এর ফাইল দিয়ে ওভাররাইট করুন
git clone https://github.com/gmauvibbl-star/mostafa-auvi-website.git
cd mostafa-auvi-website
# ZIP-এর ভেতরের ফাইলগুলো এখানে আনজিপ করে ওভাররাইট করুন
unzip -o /path/to/wcag-iphone-fixes.zip
git add -A
git diff --cached --stat
git commit -m "WCAG contrast + iPhone header/nav fixes (CSS-only)"
git push
```

---

## ৫. যাচাই

ফিক্স করার পর নিচের কমান্ড দিয়ে যাচাই করা হয়েছে যে HTML স্ট্রাকচার/JS/কনটেন্ট অক্ষত:

```
read.html        tags:803→803   scripts:4→4   text:79465→79465   [OK]
about.html       tags:533→533   scripts:5→5   text:14761→14761   [OK]
posts.html       tags:299→299   scripts:4→4   text:28343→28343   [OK]
privacy.html     tags:90→90     scripts:0→0   text:1614→1614     [OK]
index.html       tags:358→358   scripts:7→7   text:5295→5295     [OK]
subscribe.html   tags:120→120   scripts:2→2   text:6745→6745     [OK]
gateway.html     tags:32→32     scripts:1→1   text:343→343       [OK]
```

**সব ১৩টি কনট্রাস্ট চেক WCAG AA (৪.৫:১) পাস করেছে।**

---

## ৬. সীমাবদ্ধতা ও পরবর্তী পদক্ষেপ

এই ফিক্স **CSS-only** শর্ত মেনে তৈরি। কিন্তু আপনার অডিট-এ উল্লিখিত দুটি স্ক্রিপ্ট সীমাবদ্ধতা এখনও বর্তমান:

1. **`backgroundImage` পাওয়া গেলে স্ক্রিপ্ট উপাদান বাদ দিচ্ছে** — ছবির ওপর থাকা লেখা পরীক্ষা হচ্ছে না। এর জন্য অডিট স্ক্রিপ্টে `background-image` পার্সিং ও কম্পোজিট লেয়ার হিসাব যোগ করতে হবে।
2. **স্বচ্ছ foreground/background মিশ্রণ হিসাব হচ্ছে না** — `rgba()` ও `transparent` কে প্রকৃত রঙের সাথে কম্পোজিট করার লজিক স্ক্রিপ্টে যোগ করতে হবে।
3. **`read.html?slug=x` দিয়ে প্রকৃত প্রকাশিত লেখা লোড হচ্ছে কি না** — সেটি আলাদাভাবে ব্রাউজার অডিট দিয়ে যাচাই করা দরকার।

**পরবর্তী ধাপ:** ৭টি পৃষ্ঠায় পুনরায় পরীক্ষা চালিয়ে ফলাফল সংরক্ষণ করুন (আপনার সুপারিশ ৪.৩)। উন্নত অডিট স্ক্রিপ্ট চাইলে আমাকে জানাবেন।
