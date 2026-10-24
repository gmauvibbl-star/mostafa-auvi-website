import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"text/html; charset=utf-8"};
const html=(status:number,title:string,message:string)=>new Response("<!doctype html><html lang=\"bn\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+title+"</title><body style=\"font:18px/1.7 system-ui;max-width:650px;margin:40px auto;padding:0 18px\"><h1>"+title+"</h1><p>"+message+"</p><a href=\""+(Deno.env.get("SITE_URL")||"https://gmauvibbl-star.github.io/mostafa-auvi-website")+"\">মূল ওয়েবসাইটে ফিরুন</a></body></html>",{status,headers:cors});
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function hash(s:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,mailKey=Deno.env.get("RESEND_API_KEY");
 const site=(Deno.env.get("SITE_URL")||"https://gmauvibbl-star.github.io/mostafa-auvi-website").replace(/\/$/,"");
 const endpoint=url.replace(/\/$/,"")+"/functions/v1/subscription",db=createClient(url,key);
 try{
  if(req.method==="GET"){
   const u=new URL(req.url),action=u.searchParams.get("action"),token=u.searchParams.get("token");
   if(!token)return html(400,"লিংকটি সঠিক নয়","অনুগ্রহ করে ইমেইলে পাওয়া সম্পূর্ণ লিংক ব্যবহার করুন।");
   const tokenHash=await hash(token);
   if(action==="confirm"){
    const {data:sub,error}=await db.from("subscribers").select("id").eq("confirmation_token_hash",tokenHash).maybeSingle();
    if(error||!sub)return html(400,"লিংকের মেয়াদ শেষ","এই নিশ্চিতকরণ লিংকটি ভুল বা ইতিমধ্যে ব্যবহার করা হয়েছে। আবার সাবস্ক্রাইব করতে পারেন।");
    const {error:updateError}=await db.from("subscribers").update({confirmed_at:new Date().toISOString(),confirmation_token_hash:null}).eq("id",sub.id);
    if(updateError)throw updateError;
    return html(200,"সাবস্ক্রিপশন নিশ্চিত হয়েছে","ধন্যবাদ! নতুন লেখা প্রকাশিত হলে আপনার ইমেইলে আপডেট পাঠানো হবে। প্রতিটি আপডেট ইমেইলে আনসাবস্ক্রাইব লিংক থাকবে।");
   }
   if(action==="unsubscribe"){
    const {data:sub,error}=await db.from("subscribers").select("id").eq("unsubscribe_token_hash",tokenHash).maybeSingle();
    if(error||!sub)return html(400,"লিংকটি কাজ করছে না","এই আনসাবস্ক্রাইব লিংকটি ভুল বা ইতিমধ্যে ব্যবহার করা হয়েছে।");
    const {error:updateError}=await db.from("subscribers").update({unsubscribed_at:new Date().toISOString(),unsubscribe_token_hash:null}).eq("id",sub.id);
    if(updateError)throw updateError;
    return html(200,"সাবস্ক্রিপশন বন্ধ হয়েছে","আপনাকে আর নতুন লেখার ইমেইল আপডেট পাঠানো হবে না।");
   }
   return html(400,"অনুরোধটি বোঝা যায়নি","সঠিক ইমেইল লিংক ব্যবহার করুন।");
  }
  if(req.method!=="POST")return json(405,{error:"Method not allowed"});
  if(!mailKey)return json(503,{error:"Email service is not configured yet."});
  const body=await req.json();
  if(body.action!=="subscribe")return json(400,{error:"Invalid action"});
  const email=String(body.email||"").trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(400,{error:"একটি সঠিক ইমেইল ঠিকানা দিন।"});
  const token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await hash(token);
  const {error}=await db.from("subscribers").upsert({email,confirmation_token_hash:tokenHash,confirmed_at:null,unsubscribed_at:null,unsubscribe_token_hash:null},{onConflict:"email"});
  if(error)throw error;
  const confirmUrl=endpoint+"?action=confirm&token="+encodeURIComponent(token);
  const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+mailKey,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("RESEND_FROM_EMAIL")||"Mostafa Auvi <onboarding@resend.dev>",to:[email],subject:"ইমেইল সাবস্ক্রিপশন নিশ্চিত করুন",html:'<p>নতুন লেখা প্রকাশের ইমেইল পেতে নিচের লিংকে ক্লিক করুন।</p><p><a href="'+confirmUrl+'">সাবস্ক্রিপশন নিশ্চিত করুন</a></p><p>আপনি অনুরোধ না করলে এই ইমেইল উপেক্ষা করুন।</p>'})});
  if(!sent.ok)return json(502,{error:"নিশ্চিতকরণ ইমেইল পাঠানো যায়নি। পরে চেষ্টা করুন।"});
  return json(200,{message:"আপনার ইমেইলে নিশ্চিতকরণ লিংক পাঠানো হয়েছে।"});
 }catch(e){console.error(e);return req.method==="GET"?html(500,"সমস্যা হয়েছে","অনুরোধ সম্পন্ন করা যায়নি।"):json(500,{error:"অনুরোধ সম্পন্ন করা যায়নি।"});}
});