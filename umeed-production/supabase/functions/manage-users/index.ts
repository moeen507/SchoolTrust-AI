import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")!;
    const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    const publishable=publishableKeys.default||Deno.env.get("SUPABASE_ANON_KEY");
    const secret=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!publishable||!secret)throw new Error("Supabase function keys are unavailable.");

    const authHeader=req.headers.get("Authorization")||"",token=authHeader.replace(/^Bearer\s+/i,"");
    if(!token)return json({error:"Missing Authorization token"},401);

    const userClient=createClient(url,publishable,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await userClient.auth.getUser(token);
    if(authError||!authData.user)return json({error:"Invalid session"},401);

    const caller=authData.user;
    const {data:profile,error:profileError}=await admin.from("profiles").select("id,org_id,role,display_name").eq("id",caller.id).single();
    if(profileError||!profile)return json({error:"UMEED profile not found"},403);
    if(!["owner","super_admin"].includes(profile.role))return json({error:"Only the Super Admin can manage users."},403);

    const body=await req.json(),action=String(body.action||"").toLowerCase();

    if(action==="list"){
      const {data:profiles,error}=await admin.from("profiles").select("id,role,display_name,created_at").eq("org_id",profile.org_id).order("created_at",{ascending:true});
      if(error)throw error;
      const {data:usersData,error:usersError}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(usersError)throw usersError;
      const map=new Map((usersData.users||[]).map(u=>[u.id,u]));
      return json({users:(profiles||[]).map(p=>({id:p.id,email:map.get(p.id)?.email||"",role:p.role==="owner"?"super_admin":p.role,display_name:p.display_name||"",created_at:p.created_at,email_confirmed_at:map.get(p.id)?.email_confirmed_at||null,banned_until:map.get(p.id)?.banned_until||null}))});
    }

    if(action==="create"){
      const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||""),displayName=String(body.display_name||"").trim(),role=String(body.role||"").trim().toLowerCase();
      if(!email||!email.includes("@"))return json({error:"Valid email is required."},400);
      if(password.length<8)return json({error:"Password must be at least 8 characters."},400);
      if(!["admin","accountant","cashier","auditor"].includes(role))return json({error:"Invalid role."},400);
      const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:displayName||email.split("@")[0]}});
      if(createError||!created.user)throw createError||new Error("User could not be created.");
      const {error:insertError}=await admin.from("profiles").insert({id:created.user.id,org_id:profile.org_id,role,display_name:displayName||email.split("@")[0]});
      if(insertError){await admin.auth.admin.deleteUser(created.user.id).catch(()=>{});throw insertError}
      return json({user:{id:created.user.id,email:created.user.email,role,display_name:displayName||email.split("@")[0]}},201);
    }

    if(action==="update_role"){
      const targetId=String(body.user_id||""),role=String(body.role||"").trim().toLowerCase();
      if(!targetId)return json({error:"User ID is required."},400);
      if(!["admin","accountant","cashier","auditor"].includes(role))return json({error:"Invalid role."},400);
      if(targetId===caller.id)return json({error:"The Super Admin role cannot be changed here."},400);
      const {data:target,error:targetError}=await admin.from("profiles").select("id,org_id,role").eq("id",targetId).eq("org_id",profile.org_id).single();
      if(targetError||!target)return json({error:"User not found in this organization."},404);
      if(["owner","super_admin"].includes(target.role))return json({error:"Cannot modify another Super Admin."},403);
      const {error}=await admin.from("profiles").update({role}).eq("id",targetId).eq("org_id",profile.org_id);if(error)throw error;
      return json({ok:true});
    }

    if(action==="delete"){
      const targetId=String(body.user_id||""),currentPassword=String(body.current_password||"");
      if(!targetId)return json({error:"User ID is required."},400);
      if(!currentPassword)return json({error:"Current Super Admin password is required."},400);
      if(targetId===caller.id)return json({error:"You cannot delete your own Super Admin account."},400);
      const {data:target,error:targetError}=await admin.from("profiles").select("id,org_id,role").eq("id",targetId).eq("org_id",profile.org_id).single();
      if(targetError||!target)return json({error:"User not found in this organization."},404);
      if(["owner","super_admin"].includes(target.role))return json({error:"Cannot delete another Super Admin."},403);

      const verifyClient=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:verifyData,error:verifyError}=await verifyClient.auth.signInWithPassword({email:caller.email||"",password:currentPassword});
      if(verifyError||verifyData.user?.id!==caller.id)return json({error:"Super Admin password verification failed."},401);

      await admin.from("fee_entries").update({created_by:null}).eq("created_by",targetId);
      await admin.from("fee_receipts").update({created_by:null}).eq("created_by",targetId);
      await admin.from("refunds").update({created_by:null}).eq("created_by",targetId);
      await admin.from("counter_sales").update({created_by:null}).eq("created_by",targetId);
      await admin.from("activity_log").update({user_id:null}).eq("user_id",targetId);
      const {error:deleteError}=await admin.auth.admin.deleteUser(targetId);if(deleteError)throw deleteError;
      return json({ok:true});
    }
    return json({error:"Unknown action."},400);
  }catch(error){return json({error:error instanceof Error?error.message:String(error)},400)}
});