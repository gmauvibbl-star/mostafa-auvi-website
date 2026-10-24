import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:cors});
const hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function hash(s:string){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,mailKey=Deno.env.get("RESEND_API_KEY");
 if(!mailKey)return json(503,{error:"Email service is not configured."});
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,""),admin=createClient(url,service);
 const {data:{user},error:userError}=await admin.auth.getUser(token);
 if(userError||!user)return json(401,{error:"Authentication required"});
 const {data:role}=await admin.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!role)return json(403,{error:"Admin access required"});
 try{
  const {post_id}=await req.json();
  const {data:post,error:postError}=await admin.from("posts").select("id,title,slug,published,published_at").eq("id",post_id).single();
  if(postError||!post||!post.published)return json(400,{error:"Published post not found"});
  const {data:subs,error:subsError}=await admin.from("subscribers").select("id,email").not("confirmed_at","is",null).is("unsubscribed_at",null);
  if(subsError)throw subsError;
  const site=(Deno.env.get("SITE_URL")||"https://gmauvibbl-star.github.io/mostafa-auvi-website").replace(/\/$/,""),articleUrl=site+"/read.html?slug="+encodeURIComponent(post.slug),endpoint=url.replace(/\/$/,"")+"/functions/v1/subscription";
  let sent=0,failed=0;
  for(const sub of (subs||[])){
   const rawToken=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await hash(rawToken);
   const {error:saveError}=await admin.from("subscribers").update({unsubscribe_token_hash:tokenHash}).eq("id",sub.id);
   if(saveError){failed++;continue}
   const unsubscribeUrl=endpoint+"?action=unsubscribe&token="+encodeURIComponent(rawToken);
   const safeTitle=post.title.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
   const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+mailKey,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("RESEND_FROM_EMAIL")||"Mostafa Auvi <onboarding@resend.dev>",to:[sub.email],subject:"নতুন লেখা: "+post.title,html:'<h2>'+safeTitle+'</h2><p>Mostafa Auvi ওয়েবসাইটে নতুন লেখা প্রকাশিত হয়েছে।</p><p><a href="'+articleUrl+'">লেখাটি পড়ুন</a></p><p><a href="'+unsubscribeUrl+'">ইমেইল আপডেট বন্ধ করুন</a></p>'})});
   if(r.ok)sent++;else failed++;
  }
  return json(200,{sent,failed});
 }catch(e){console.error(e);return json(500,{error:"Notification failed"});}
});