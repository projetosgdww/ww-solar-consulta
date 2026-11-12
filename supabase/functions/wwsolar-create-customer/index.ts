// Edge Function: wwsolar-create-customer (DEV).
// Executa só no backend. Credenciais do Supabase nunca ficam no GitHub Pages.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const url=Deno.env.get("SUPABASE_URL")||"";
const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const origins=new Set((Deno.env.get("WWSOLAR_ALLOWED_ORIGINS")||"https://ww-solar-clientes-dev.pages.dev").split(",").map(x=>x.trim()).filter(Boolean));
const emailRE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(status:number,body:Record<string,unknown>,origin:string){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      "Content-Type":"application/json",
      "Cache-Control":"no-store",
      "Vary":"Origin",
      "Access-Control-Allow-Origin":origin,
      "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods":"POST,OPTIONS"
    }
  });
}
Deno.serve(async(req)=>{
  const origin=req.headers.get("origin")||"";
  if(!origin||!origins.has(origin))
    return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":origin,
    "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Vary":"Origin"
  }});
  if(req.method!=="POST")return reply(405,{error:"method_not_allowed"},origin);
  if(!url||!secret)return reply(503,{error:"server_unconfigured"},origin);
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))return reply(401,{error:"unauthorized"},origin);
  const token=auth.slice(7).trim();
  if(!token)return reply(401,{error:"unauthorized"},origin);

  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  // Consulta servidor a servidor: nunca aceitar role do corpo da requisição.
  const {data:identity,error:identityError}=await admin.auth.getUser(token);
  if(identityError||identity?.user?.app_metadata?.wwsolar_role!=="admin")
    return reply(403,{error:"not_authorized"},origin);

  let email="";
  try{
    const payload=await req.json();
    email=String(payload?.email||"").trim().toLowerCase();
  }catch{ return reply(400,{error:"invalid_payload"},origin); }
  if(email.length>254||!emailRE.test(email))
    return reply(400,{error:"invalid_email"},origin);

  // 128 bits da fonte criptográfica do runtime. A senha não é armazenada
  // no código, banco ou logs; só existe no Supabase Auth e nesta resposta.
  const bytes=crypto.getRandomValues(new Uint8Array(18));
  const password=Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");

  const {data:created,error:createError}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,app_metadata:{wwsolar_role:"client"}
  });
  if(createError||!created?.user)
    return reply(409,{error:"cannot_create_customer"},origin);

  const {error:accessError}=await admin.from("wwsolar_client_access").insert({
    user_id:created.user.id,active:true
  });
  if(accessError){
    // Rollback compensatório: não deixar conta autenticável sem vínculo.
    await admin.auth.admin.deleteUser(created.user.id);
    return reply(500,{error:"cannot_activate_customer"},origin);
  }
  return reply(201,{email,password},origin);
});
