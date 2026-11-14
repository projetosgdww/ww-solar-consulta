// Edge Function: wwsolar-create-customer (DEV).
// Executa só no backend. Credenciais do Supabase nunca ficam no GitHub Pages.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const url=Deno.env.get("SUPABASE_URL")||"";
const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const origins=new Set((Deno.env.get("WWSOLAR_ALLOWED_ORIGINS")||"https://ww-solar-clientes-dev.pages.dev").split(",").map(x=>x.trim()).filter(Boolean));
// Domínios exatos da V1; nunca liberar origem arbitrária ou curinga.
origins.add("https://ww-solar.pages.dev");
origins.add("https://catalogo.wwplatform.com.br");
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
  if(identityError||!identity?.user)
    return reply(403,{error:"not_authorized"},origin);
  // Um cliente pode confirmar a troca da própria senha, sem acesso a operações admin.
  // O catálogo continua dependendo de autenticação e acesso ativo.
  let submitted:Record<string,unknown>;
  try{submitted=await req.json();}catch{return reply(400,{error:"invalid_payload"},origin);}
  if(submitted?.action==="complete_setup"){
    const user=identity.user;
    if(user.app_metadata?.wwsolar_role!=="client" ||
       user.app_metadata?.wwsolar_password_change_required!==true)
      return reply(403,{error:"not_allowed"},origin);
    const {data:access,error:accessError}=await admin.from("wwsolar_client_access")
      .select("active,email").eq("user_id",user.id).maybeSingle();
    if(accessError||!access?.active||access.email!==user.email?.trim().toLowerCase())
      return reply(403,{error:"access_inactive"},origin);
    // Executar SOMENTE após updateUser({password}) no aplicativo.
    // A flag é uma exigência do fluxo oficial de interface, não uma proteção
    // contra clientes maliciosos que chamem diretamente esta API.
    const {error:completeError}=await admin.auth.admin.updateUserById(user.id,{
      app_metadata:{...user.app_metadata,wwsolar_password_change_required:false}
    });
    if(completeError)return reply(500,{error:"setup_completion_failed"},origin);
    return reply(200,{action:"complete_setup",completed:true},origin);
  }
  if(identity.user.app_metadata?.wwsolar_role!=="admin")
    return reply(403,{error:"not_authorized"},origin);

  let email="";
  let action="create";
  let enabled:unknown=undefined;
  try{
    email=String(submitted?.email||"").trim().toLowerCase();
    action=String(submitted?.action||"create");
    enabled=submitted?.enabled;
  }catch{ return reply(400,{error:"invalid_payload"},origin); }
  if(email.length>254||!emailRE.test(email))
    return reply(400,{error:"invalid_email"},origin);
  if(action!=="create"&&action!=="rotate"&&action!=="set_access")
    return reply(400,{error:"invalid_action"},origin);

  if(action==="set_access"){
    if(typeof enabled!=="boolean")return reply(400,{error:"invalid_status"},origin);
    const {data:access,error:lookupError}=await admin.from("wwsolar_client_access")
      .select("user_id,email,active").eq("email",email).maybeSingle();
    if(lookupError)return reply(500,{error:"access_lookup_failed"},origin);
    if(!access)return reply(404,{error:"client_not_found"},origin);
    const {data:target,error:targetError}=await admin.auth.admin.getUserById(access.user_id);
    if(targetError||!target?.user
      ||target.user.email?.trim().toLowerCase()!==email
      ||target.user.app_metadata?.wwsolar_role!=="client")
      return reply(409,{error:"client_identity_not_valid"},origin);
    const {error:upErr}=await admin.from("wwsolar_client_access")
      .update({active:enabled}).eq("user_id",access.user_id);
    if(upErr)return reply(500,{error:"access_update_failed"},origin);
    return reply(200,{email,active:enabled,action:"set_access"},origin);
  }

  // 72 bits reais de aleatoriedade: prefixo de marca + 12 caracteres aleatórios.
  // Exemplo de FORMATO (não é senha válida): GDWW-Ab12Cd-Ef34Gh.
  // Jamais usar trecho do e-mail ou dados previsíveis como senha.
  const bytes=crypto.getRandomValues(new Uint8Array(9));
  const random=btoa(String.fromCharCode(...bytes))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  const password="GDWW-"+random.slice(0,6)+"-"+random.slice(6);

  if(action==="rotate"){
    const {data:access,error:accessError}=await admin.from("wwsolar_client_access")
      .select("user_id,active,email").eq("email",email).maybeSingle();
    if(accessError)return reply(500,{error:"access_lookup_failed"},origin);
    if(!access||!access.active)return reply(404,{error:"client_not_found"},origin);
    const {data:target,error:targetError}=await admin.auth.admin.getUserById(access.user_id);
    if(targetError||!target?.user
      ||target.user.email?.trim().toLowerCase()!==email
      ||target.user.app_metadata?.wwsolar_role!=="client")
      return reply(409,{error:"client_identity_not_valid"},origin);
    const {error:rotateError}=await admin.auth.admin.updateUserById(
      target.user.id,{password,app_metadata:{...target.user.app_metadata,wwsolar_password_change_required:true}}
    );
    if(rotateError)return reply(500,{error:"password_rotation_failed"},origin);
    return reply(200,{email,password,action:"rotate"},origin);
  }

  const {data:created,error:createError}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,app_metadata:{wwsolar_role:"client",wwsolar_password_change_required:true}
  });
  if(createError||!created?.user)
    return reply(409,{error:"cannot_create_customer"},origin);

  const {error:accessError}=await admin.from("wwsolar_client_access").insert({
    user_id:created.user.id,email,active:true
  });
  if(accessError){
    // Rollback compensatório: não deixar conta autenticável sem vínculo.
    await admin.auth.admin.deleteUser(created.user.id);
    return reply(500,{error:"cannot_activate_customer"},origin);
  }
  return reply(201,{email,password,action:"create"},origin);
});
