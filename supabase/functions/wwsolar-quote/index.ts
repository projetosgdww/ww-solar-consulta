// WW Solar DEV — pedidos/cotacoes. Somente backend possui chave privilegiada.
// Snapshot e total calculados AQUI a partir do catálogo aprovado do Supabase.
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const url=Deno.env.get("SUPABASE_URL")||"";
const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const origins=new Set((Deno.env.get("WWSOLAR_ALLOWED_ORIGINS")||
  "https://ww-solar-clientes-dev.pages.dev").split(",").map(x=>x.trim()).filter(Boolean));
// Domínios exatos da V1; nunca liberar origem arbitrária ou curinga.
origins.add("https://ww-solar.pages.dev");
origins.add("https://catalogo.wwplatform.com.br");
const states=new Set(["registrado","em_atendimento","fechado","cancelado"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function result(status:number,body:Record<string,unknown>,origin:string){
  return new Response(JSON.stringify(body),{status,headers:{
    "Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",
    "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"POST,OPTIONS"
  }});
}
function brl(cents:number){
 return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
}
function messageFor(order:{
  id:string,customer_email:string,total_cents:number,
  items:Array<{sku:string,title:string,qty:number,subtotal_cents:number}>
}){
 return [
 "Olá! Gostaria de solicitar uma cotação WW Solar.",
 "Referência: "+order.id.slice(0,8).toUpperCase(),
 "Cliente: "+order.customer_email,"",
 ...order.items.map(x=>"- "+x.qty+" × "+x.title+" ["+x.sku+"] — "+brl(x.subtotal_cents)),
 "", "Total de referência: "+brl(order.total_cents),
 "Pedido registrado na WW Solar. Confirme preço final, estoque, frete e condições.",
 ...(order.items.some(x=>x.sku.startsWith("FOTUS-"))?[
   "Kits prontos Fotus: frete incluso para Canindé/CE; outras cidades sob consulta.",
   "Entrega prevista em até 15 dias úteis, com possibilidade de mais 5 dias úteis após confirmação do pedido e disponibilidade."
 ]:[]),
 "Este envio é uma solicitação de negociação, não uma compra confirmada."
 ].join("\n");
}
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(!origin||!origins.has(origin))return new Response('origin_not_allowed',{status:403});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
   "Access-Control-Allow-Origin":origin,
   "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
   "Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"
 }});
 if(req.method!=="POST")return result(405,{error:"method_not_allowed"},origin);
 if(!url||!secret)return result(503,{error:"server_unconfigured"},origin);
 const auth=req.headers.get("authorization")||"";
 if(!/^Bearer\s+\S+$/.test(auth))return result(401,{error:"not_authenticated"},origin);
 const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:identity,error:identityError}=await admin.auth.getUser(auth.slice(7).trim());
 if(identityError||!identity?.user)return result(401,{error:"invalid_session"},origin);
 const user=identity.user;
 if(user.app_metadata?.wwsolar_password_change_required===true)
   return result(403,{error:"password_change_required"},origin);
 const isAdmin=user.app_metadata?.wwsolar_role==="admin";
 let payload:Record<string,unknown>;
 try{
   payload=await req.json();
   if(!payload||typeof payload!=="object"||Array.isArray(payload))throw Error();
 }catch{
   return result(400,{error:"bad_json"},origin);
 }
 if(payload.action==="status"){
   if(!isAdmin)return result(403,{error:"admin_only"},origin);
   const id=String(payload.id||"");
   const status=String(payload.status||"");
   if(!uuid.test(id)||!states.has(status))return result(400,{error:"bad_status"},origin);
   const {data:existing,error:readError}=await admin.from("wwsolar_quote_requests")
     .select("id,status").eq("id",id).maybeSingle();
   if(readError)return result(500,{error:"read_failed"},origin);
   if(!existing)return result(404,{error:"order_not_found"},origin);
   if(existing.status===status)return result(200,{id,status,unchanged:true},origin);
   // Trigger de banco grava auditoria na MESMA transacao e preserva o snapshot.
   const {data:changed,error:writeError}=await admin.from("wwsolar_quote_requests")
     .update({status,status_updated_by:user.id,updated_at:new Date().toISOString()})
     .eq("id",id).eq("status",existing.status).select("id,status").maybeSingle();
   if(writeError)return result(500,{error:"update_and_audit_failed"},origin);
   if(!changed)return result(409,{error:"concurrent_update"},origin);
   return result(200,{id,status},origin);
 }
 if(payload.action!=="submit")return result(400,{error:"bad_action"},origin);
 const key=String(payload.request_key||"");
 if(!uuid.test(key))return result(400,{error:"bad_request_key"},origin);
 const expectedTotal=payload.expected_total_cents;
 if(!Number.isSafeInteger(expectedTotal)||Number(expectedTotal)<=0)
   return result(400,{error:"expected_total_required"},origin);
 // Cliente precisa estar ativo. Admin pode usar carrinho de testes próprio.
 if(!isAdmin){
   if(user.app_metadata?.wwsolar_role!=="client")
     return result(403,{error:"client_only"},origin);
   const {data:access,error:aerr}=await admin.from("wwsolar_client_access")
     .select("active").eq("user_id",user.id).maybeSingle();
   if(aerr)return result(500,{error:"access_check_failed"},origin);
   if(!access?.active)return result(403,{error:"client_inactive"},origin);
 }
 const {data:already,error:duperr}=await admin.from("wwsolar_quote_requests")
   .select("id,customer_email,items,total_cents,created_at,status")
   .eq("user_id",user.id).eq("request_key",key).maybeSingle();
 if(duperr)return result(500,{error:"request_check_failed"},origin);
 if(already)return result(200,{order:already,message:messageFor(already),existing:true},origin);
 const {data:cart,error:cartError}=await admin.from("wwsolar_carts")
   .select("lines,updated_at").eq("user_id",user.id).maybeSingle();
 if(cartError)return result(500,{error:"cart_read_failed"},origin);
 const time=Date.parse(String(cart?.updated_at||""));
 if(!Number.isFinite(time)||Date.now()-time>25*60*1000||time-Date.now()>60*1000)
   return result(409,{error:"quote_expired"},origin);
 const lines=cart?.lines;
 if(!Array.isArray(lines)||lines.length<1||lines.length>25)
   return result(422,{error:"empty_or_invalid_cart"},origin);
 const unique=new Set<string>();
 for(const l of lines){
   if(typeof l?.id!=="string"||!/^[a-zA-Z0-9-]{3,64}$/.test(l.id)
      ||!Number.isInteger(l.qty)||l.qty<1||l.qty>99||unique.has(l.id))
      return result(422,{error:"bad_line"},origin);
   unique.add(l.id);
 }
 const {data:products,error:catalogError}=await admin.from("wwsolar_catalog")
   .select("id,title,price,active,approved").in("id",[...unique])
   .eq("active",true).eq("approved",true);
 if(catalogError)return result(500,{error:"catalog_read_failed"},origin);
 if(products?.length!==unique.size)return result(409,{error:"product_unavailable"},origin);
 const byId=new Map(products.map(p=>[String(p.id),p]));
 let total=0;
 const items=[];
 for(const l of lines){
   const product=byId.get(l.id);
   const price=Number(product?.price);
   const unit=Math.round(price*100);
   if(!Number.isSafeInteger(unit)||unit<=0||Math.abs(unit/100-price)>0.001)
     return result(409,{error:"price_invalid"},origin);
   const subtotal=unit*l.qty;
   total+=subtotal;
   if(!Number.isSafeInteger(total)||total>1e12)return result(422,{error:"total_too_high"},origin);
   items.push({sku:l.id,title:String(product!.title),qty:l.qty,unit_cents:unit,subtotal_cents:subtotal});
 }
 if(total!==expectedTotal)return result(409,{error:"price_changed"},origin);
 if(!user.email)return result(409,{error:"missing_email"},origin);
 const draft={id:"00000000-0000-4000-8000-000000000000",customer_email:user.email,
   items,total_cents:total};
 if(messageFor(draft).length>3500)return result(422,{error:"message_too_large"},origin);
 const {data:saved,error:saveError}=await admin.from("wwsolar_quote_requests")
   .insert({user_id:user.id,request_key:key,customer_email:user.email,
      items,total_cents:total,status:"registrado"})
   .select("id,customer_email,items,total_cents,created_at,status").single();
 if(saveError){
   // Requisições duplicadas: idempotência sem criar dois pedidos.
   if(saveError.code==="23505"){
     const {data:prev}=await admin.from("wwsolar_quote_requests")
       .select("id,customer_email,items,total_cents,created_at,status")
       .eq("user_id",user.id).eq("request_key",key).maybeSingle();
     if(prev)return result(200,{order:prev,message:messageFor(prev),existing:true},origin);
   }
   return result(500,{error:"order_write_failed"},origin);
 }
 return result(201,{order:saved,message:messageFor(saved),existing:false},origin);
});
