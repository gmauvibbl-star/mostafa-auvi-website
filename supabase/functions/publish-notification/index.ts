import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,mailKey=Deno.env.get("RESEND_API_KEY");
 if(!mailKey)return json(503,{error:"Email service is not configured."});
 const auth=req.headers.get("Authorization")||"",token=auth.replace(/^Bearer\s+/i,"");
 const admin=createClient(url,service);
 const {data:{user},error:userError}=await admin.auth.getUser(token);
 if(userError||!user)return json(401,{error:"Authentication required"});
 const {data:role}=await admin.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!role)return json(403,{error:"Admin access required"});
 try{
  const {post_id}=await req.json();
  const {data:post,error:postError}=await admin.from("posts").select("id,title,slug,body,published,published_at").eq("id",post_id).single();
  if(postError||!post||!post.published)return json(400,{error:"Published post not found"});
  const {data:subs,error:subsError}=await admin.from("subscribers").select("email").not("confirmed_at","is",null).is("unsubscribed_at",null);
  if(subsError)throw subsError;
  const site=(Deno.env.get("SITE_URL")||"https://gmauvibbl-star.github.io/mostafa-auvi-website").replace(/\/$/,"");
  const articleUrl=site+"/read.html?slug="+encodeURIComponent(post.slug);
  let sent=0,failed=0;
  for(const sub of (subs||[])){
   const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+mailKey,"Content-Type":"application/json"},body:JSON.stringify({from:Deno.env.get("RESEND_FROM_EMAIL")||"Mostafa Auvi <onboarding@resend.dev>",to:[sub.email],subject:"নতুন লেখা: "+post.title,html:'<h2>'+post.title.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+'</h2><p>Mostafa Auvi ওয়েবসাইটে নতুন লেখা প্রকাশিত হয়েছে।</p><p><a href="'+articleUrl+'">লেখাটি পড়ুন</a></p><p>ইমেইল আপডেট বন্ধ করতে ওয়েবসাইটের মালিকের সঙ্গে যোগাযোগ করুন।</p>'})});
   if(r.ok)sent++;else failed++;
  }
  return json(200,{sent,failed});
 }catch(e){console.error(e);return json(500,{error:"Notification failed"});}
});