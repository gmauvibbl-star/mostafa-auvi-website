import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body), { status, headers:cors });
const hex = (bytes:ArrayBuffer) => [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
async function hash(s:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))}
Deno.serve(async (req) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json(405,{error:"Method not allowed"});
  const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, mailKey=Deno.env.get("RESEND_API_KEY"), site=(Deno.env.get("SITE_URL")||"https://gmauvibbl-star.github.io/mostafa-auvi-website").replace(/\/$/,"");
  if(!mailKey) return json(503,{error:"Email service is not configured yet."});
  const db=createClient(url,key);
  try {
    const body=await req.json();
    if(body.action==="subscribe"){
      const email=String(body.email||"").trim().toLowerCase();
      if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400,{error:"একটি সঠিক ইমেইল ঠিকানা দিন।"});
      const token=crypto.randomUUID()+crypto.randomUUID(), tokenHash=await hash(token);
      const {error}=await db.from("subscribers").upsert({email,confirmation_token_hash:tokenHash,confirmed_at:null,unsubscribed_at:null},{onConflict:"email"});
      if(error) throw error;
      const confirmUrl=site+"/supabase/functions/v1/subscription?action=confirm&token="+encodeURIComponent(token);
      const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+mailKey,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("RESEND_FROM_EMAIL")||"Mostafa Auvi <onboarding@resend.dev>",to:[email],subject:"ইমেইল সাবস্ক্রিপশন নিশ্চিত করুন",html:'<p>নতুন লেখা প্রকাশের ইমেইল পেতে নিচের লিংকে ক্লিক করুন।</p><p><a href="'+confirmUrl+'">সাবস্ক্রিপশন নিশ্চিত করুন</a></p><p>আপনি অনুরোধ না করলে এই ইমেইল উপেক্ষা করুন।</p>'})});
      if(!sent.ok) return json(502,{error:"নিশ্চিতকরণ ইমেইল পাঠানো যায়নি। পরে চেষ্টা করুন।"});
      return json(200,{message:"আপনার ইমেইলে নিশ্চিতকরণ লিংক পাঠানো হয়েছে।"});
    }
    return json(400,{error:"Invalid action"});
  } catch(e) { console.error(e); return json(500,{error:"অনুরোধ সম্পন্ন করা যায়নি।"}); }
});