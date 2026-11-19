import fs from "node:fs/promises";
import vm from "node:vm";
const SITE="https://gmauvibbl-star.github.io/mostafa-auvi-website";
const source=await fs.readFile("read.html","utf8");
const m=source.match(/const STATIC_CHANDRADWIP = (\{[\s\S]*?\n\});/);
const me=source.match(/const STATIC_CHANDRADWIP_EN = (\{[\s\S]*?\n\});/);
if(!m) throw new Error("STATIC_CHANDRADWIP not found");
if(!me) throw new Error("STATIC_CHANDRADWIP_EN not found");
const data=vm.runInNewContext("("+m[1]+")");
const dataEn=vm.runInNewContext("("+me[1]+")");
const slugs=["chandradwip-writing","chandradwip-characters","chandradwip-settlement"];
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
for(const slug of slugs){
 const p=data[slug]; if(!p?.title||!p?.body||p.body.length<1000) throw new Error("Missing article content: "+slug);
 const plain=String(p.excerpt||p.body).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
 const desc=plain.slice(0,155); const url=SITE+"/posts/"+slug+".html";
 const body=String(p.body).replace(/\bsrc=(["'])assets\//g,'src=$1../assets/').replace(/\bhref=(["'])assets\//g,'href=$1../assets/');
 const schema={"@context":"https://schema.org","@type":"Article","headline":p.title,"description":desc,"url":url,"mainEntityOfPage":{"@type":"WebPage","@id":url},"author":{"@type":"Person","name":"Mostafa Auvi"},"datePublished":p.published_at,"inLanguage":"bn"};
 const html=`<!-- GENERATED-CHANDRADWIP-ARTICLE: source is read.html -->
<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)} | Mostafa Auvi</title><meta name="description" content="${esc(desc)}"><meta name="author" content="Mostafa Auvi">
<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="stylesheet" href="../assets/css/site-wide-theme.css">
<style>body{margin:0;background:#5A6B3F;color:#1A1410;font-family:"Noto Serif Bengali",serif}.page{max-width:900px;margin:auto;background:#F4ECD8;min-height:100vh;padding:24px}header{border-bottom:2px solid #0F3D3E;padding-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}header nav{margin-top:8px}a{color:#0F3D3E}.lang-select{font:inherit;border:1px solid #C8B898;border-radius:18px;padding:7px 30px 7px 12px;background:#FFFEF7;color:#0F3D3E}.header-left{min-width:0}main{max-width:800px;margin:28px auto;background:#FFFEF7;padding:42px;line-height:2;font-size:18px}h1{color:#0F3D3E;line-height:1.4}.article-body img{max-width:100%;height:auto}figure{text-align:center}figcaption{font-size:14px}@media(max-width:640px){main{padding:22px;font-size:16px}.page{padding:12px}header{align-items:flex-start}.lang-select{font-size:14px}}</style>
</head><body><div class="page"><header><div class="header-left"><a href="../">MOSTAFA AUVI · মোস্তফা অভি</a><nav><a href="../">প্রচ্ছদ</a> · <a href="../posts.html?category=chandradwip">চন্দ্রদ্বীপ</a> · <a href="../about.html">লেখক</a></nav></div><label><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">ভাষা নির্বাচন</span><select class="lang-select" aria-label="ভাষা নির্বাচন" onchange="if(this.value) location.href=this.value"><option value="${url}" selected>বাংলা</option><option value="../read.html?slug=${slug}&amp;lang=en">English</option></select></label></header>
<main><div>চন্দ্রদ্বীপ</div><h1>${esc(p.title)}</h1><p>মোস্তফা অভি · ${esc(p.published_at||"")}</p><article class="article-body">${body}</article><hr><a href="../posts.html?category=chandradwip">← চন্দ্রদ্বীপ বিভাগে ফিরুন</a></main></div></body></html>`;
 await fs.writeFile("posts/"+slug+".html",html,"utf8");
}
console.log("Generated 3 crawlable Chandradwip pages.");