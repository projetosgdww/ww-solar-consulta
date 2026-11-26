import aneel from '../../economia-solar-aneel.js';

// Public regulatory data only. No database, no credentials, no mutation.
// The exact official origin limits this route to the commercial catalog.
const devHost='catalogo.wwplatform.com.br';
function reply(data,status=200,cacheControl='no-store'){
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cacheControl,'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
}
export async function handle(request,{lookup=aneel.lookup,cache=null,waitUntil=null}={}){
 const url=new URL(request.url);
 if(url.origin!=='https://'+devHost)return reply({ok:false,code:'PROD_ONLY'},404);
 if(request.method!=='GET')return reply({ok:false,code:'METHOD_NOT_ALLOWED'},405);
 const month=url.searchParams.get('month');
 if([...url.searchParams.keys()].length!==1||!month||!/^2026-(0[1-9]|1[0-2])$/.test(month))return reply({ok:false,code:'INVALID_MONTH'},400);
 const key=new Request(url.origin+'/api/aneel?month='+month+'&cacheVersion=1');
 if(cache){try{const hit=await cache.match(key);if(hit)return hit;}catch{}}
 try{
  const result=await lookup(month);
  const response=reply({ok:true,source:'ANEEL DataStore',queriedAt:new Date().toISOString(),result},200,'public, max-age=900');
  if(cache&&waitUntil){try{waitUntil(cache.put(key,response.clone()).catch(()=>{}));}catch{}}
  return response;
 }catch(err){
  const message=String(err?.message??'');
  const source=['componentes','bandeiras','validacao'].includes(err?.source)?err.source:'consulta';
  const code=err?.name==='AbortError'?'UPSTREAM_TIMEOUT':/^ANEEL HTTP [0-9]{3}$/.test(message)?'UPSTREAM_HTTP':/incomplet|inválid|conflitante|inconsistente|reconhecida/.test(message)?'UPSTREAM_DATA':'UPSTREAM_UNAVAILABLE';
  const httpStatus=/^ANEEL HTTP ([0-9]{3})$/.exec(message)?.[1];
  console.warn('ANEEL lookup failed',month,source,code,httpStatus??'',String(err?.name??'Error'));
  return reply({ok:false,code,source,...(httpStatus?{httpStatus:Number(httpStatus)}:{})},502);
 }
}
export function onRequest(context){
 return handle(context.request,{cache:typeof caches!=='undefined'?caches.default:null,waitUntil:p=>context.waitUntil(p)});
}
