import {state,publicReference} from './tarifas-dev.js';
const origin='https://ww-solar-economia-dev.pages.dev';
function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
export async function handle(request,env){
 const url=new URL(request.url);
 if(url.origin!==origin)return reply({ok:false,code:'DEV_ONLY'},404);
 if(request.method!=='GET')return reply({ok:false,code:'METHOD'},405);
 if(url.search)return reply({ok:false,code:'INVALID_QUERY'},400);
 if(!env.TARIFFS_DEV)return reply({ok:false,code:'STORAGE_UNAVAILABLE'},503);
 try{return reply({ok:true,...publicReference(await state(env.TARIFFS_DEV))});}
 catch{return reply({ok:false,code:'STORAGE_UNAVAILABLE'},503);}
}
export function onRequest(context){return handle(context.request,context.env);}
