import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function randomPassword(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#";
  const required=["A","a","7","@"];
  const bytes=crypto.getRandomValues(new Uint32Array(12));
  const arr=[...required,...Array.from(bytes.slice(4),n=>chars[n%chars.length])];
  for(let i=arr.length-1;i>0;i--){const r=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[arr[i],arr[r]]=[arr[r],arr[i]]}
  return arr.join("");
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")!;
    const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY");
    const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!pub||!sec)throw new Error("Supabase function keys unavailable.");
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json(),action=String(body.action||"").toLowerCase();
    if(action==="student_login"){
      const loginId=String(body.login_id||"").trim(),password=String(body.password||"");
      if(!loginId||!password)return json({error:"Roll number and password are required."},400);
      const {data:account,error}=await admin.from("student_accounts").select("auth_user_id,login_id,status").eq("login_id",loginId).eq("status","active").maybeSingle();
      if(error||!account)return json({error:"Invalid roll number or password."},401);
      const {data:userData,error:userError}=await admin.auth.admin.getUserById(account.auth_user_id);
      if(userError||!userData.user?.email)return json({error:"Invalid roll number or password."},401);
      const client=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data:signed,error:signError}=await client.auth.signInWithPassword({email:userData.user.email,password});
      if(signError||!signed.session)return json({error:"Invalid roll number or password."},401);
      return json({access_token:signed.session.access_token,refresh_token:signed.session.refresh_token,expires_in:signed.session.expires_in,user:signed.user});
    }
    const authHeader=req.headers.get("Authorization")||"",token=authHeader.replace(/^Bearer\s+/i,"");
    if(!token)return json({error:"Missing Authorization token"},401);
    const userClient=createClient(url,pub,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await userClient.auth.getUser(token);
    if(authError||!authData.user)return json({error:"Invalid session"},401);
    const {data:profile}=await admin.from("profiles").select("org_id,role").eq("id",authData.user.id).maybeSingle();
    if(!profile||!["owner","admin"].includes(profile.role))return json({error:"Only Super Admin/Admin can manage student accounts."},403);
    if(action==="provision"){
      const ids=Array.isArray(body.student_ids)?body.student_ids.map(String):[];
      let q=admin.from("students").select("id,org_id,roll_number,student_name,father_name,phone_number,status").eq("org_id",profile.org_id).eq("status","active");
      if(ids.length)q=q.in("id",ids);
      const {data:students,error:studentsError}=await q;if(studentsError)throw studentsError;
      const {data:existing}=await admin.from("student_accounts").select("student_id").eq("org_id",profile.org_id);
      const exists=new Set((existing||[]).map((x:any)=>x.student_id)),created:any[]=[],skipped:any[]=[];
      for(const s of students||[]){
        if(exists.has(s.id)){skipped.push({student_id:s.id,roll_number:s.roll_number,reason:"Account already exists"});continue}
        const temporary_password=randomPassword(),email=`student.${s.id.replace(/-/g,"")}@students.umeed.local`;
        const {data:u,error:e}=await admin.auth.admin.createUser({email,password:temporary_password,email_confirm:true,user_metadata:{student_id:s.id,roll_number:s.roll_number,role:"student"},app_metadata:{role:"student"}});
        if(e||!u.user){skipped.push({student_id:s.id,roll_number:s.roll_number,reason:e?.message||"Auth creation failed"});continue}
        const {error:m}=await admin.from("student_accounts").insert({auth_user_id:u.user.id,org_id:profile.org_id,student_id:s.id,login_id:String(s.roll_number),must_change_password:true,status:"active"});
        if(m){await admin.auth.admin.deleteUser(u.user.id).catch(()=>{});skipped.push({student_id:s.id,roll_number:s.roll_number,reason:m.message});continue}
        created.push({student_id:s.id,roll_number:s.roll_number,student_name:s.student_name,parent_guardian:s.father_name,phone:s.phone_number,login_id:String(s.roll_number),temporary_password});
      }
      return json({created,skipped});
    }
    if(action==="status"){
      const {data,error}=await admin.from("student_accounts").select("student_id,login_id,must_change_password,status,created_at").eq("org_id",profile.org_id);
      if(error)throw error;return json({accounts:data||[]});
    }
    if(action==="reset_password"){
      const studentId=String(body.student_id||"");if(!studentId)return json({error:"Student ID is required."},400);
      const {data:account,error}=await admin.from("student_accounts").select("auth_user_id,login_id").eq("org_id",profile.org_id).eq("student_id",studentId).single();
      if(error||!account)return json({error:"Student account not found."},404);
      const temporary_password=randomPassword();const {error:u}=await admin.auth.admin.updateUserById(account.auth_user_id,{password:temporary_password});if(u)throw u;
      await admin.from("student_accounts").update({must_change_password:true}).eq("auth_user_id",account.auth_user_id);
      return json({login_id:account.login_id,temporary_password});
    }
    return json({error:"Unknown action."},400);
  }catch(error){return json({error:error instanceof Error?error.message:String(error)},400)}
});