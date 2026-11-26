import core from '../../economia-solar-core.js';
const host='ww-solar-economia-dev.pages.dev';
const origin='https://'+host;
const authUrl='https://drutoqwkjzdsirqthdux.supabase.co/auth/v1/user';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
async function authorize(request,env,fetcher){
 const bearer=request.headers.get('Authorization')??'';
 if(!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(bearer))return {status:401};
 if(typeof env.TARIFF_AUTH_PUBLISHABLE_KEY!=='string'||!env.TARIFF_AUTH_PUBLISHABLE_KEY.trim())return {status:503,code:'AUTH_CONFIG'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetcher(authUrl,{method:'GET',headers:{Authorization:bearer,apikey:env.TARIFF_AUTH_PUBLISHABLE_KEY.trim(),Accept:'application/json'},redirect:'manual',signal:controller.signal});
  if(r.status===401||r.status===403)return {status:401};
  if(!r.ok)return {status:503,code:'AUTH_HTTP',httpStatus:r.status};
  let user;try{user=await r.json();}catch{return {status:503,code:'AUTH_RESPONSE'};}
  if(!uuid.test(user?.id??'')||user.is_anonymous===true||user.app_metadata?.wwsolar_role!=='admin')return {status:403};
  return {actor:user.id};
 }catch(err){return {status:503,code:controller.signal.aborted||err?.name==='AbortError'?'AUTH_TIMEOUT':'AUTH_NETWORK'};}finally{clearTimeout(timer);}
}
export function replay(rows){
 const versions=new Map();let active=null,revision=0;
 for(const e of rows){
  if(!Number.isSafeInteger(e.seq)||e.seq<=revision||e.expected_seq!==revision)throw Error('invalid_history');
  if(e.action==='save'){
   if(versions.has(e.version_id))throw Error('invalid_history');
   versions.set(e.version_id,{id:e.version_id,state:'salvo',draft:core.validateTariffDraft(JSON.parse(e.draft_json)),createdAt:e.occurred_at});
  }else if(e.action==='approve'){
   const v=versions.get(e.version_id);if(!v||v.state!=='salvo')throw Error('invalid_history');v.state='aprovado';
  }else if(e.action==='activate'){
   if(versions.get(e.version_id)?.state!=='aprovado')throw Error('invalid_history');active=e.version_id;
  }else if(e.action==='restore_default'){active=null;}else throw Error('invalid_history');
  revision=e.seq;
 }
 return {revision,active,versions:[...versions.values()],events:rows.slice(-50).map(e=>({seq:e.seq,action:e.action,id:e.version_id,actor:e.actor_id,at:e.occurred_at}))};
}
export async function state(db){
 const r=await db.prepare('SELECT seq, action, version_id, expected_seq, actor_id, occurred_at, draft_json FROM tariff_events ORDER BY seq LIMIT 1001').all();
 if(!r.success||r.results.length>1000)throw Error('history_limit');
 return replay(r.results);
}
export function sameTariff(a,b){return ['reference','te','tusd','fioB','icms','pis','cofins','flag'].every(k=>a[k]===b[k]);}
export function publicReference(s){
 if(s.active===null)return {revision:s.revision,profile:null};
 const v=s.versions.find(x=>x.id===s.active&&x.state==='aprovado');
 if(!v)throw Error('invalid_active');
 const d=core.validateTariffDraft(v.draft);
 const {reference,te,tusd,fioB,icms,pis,cofins,flag}=d;
 return {revision:s.revision,profile:{reference,te,tusd,fioB,icms,pis,cofins,flag}};
}
export function command(body){
 if(!body||!['save','approve','activate','restore_default'].includes(body.action)||!uuid.test(body.requestId??'')||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)throw Error('invalid_command');
 const {action,requestId,expectedRevision}=body;
 if(action==='save')return {action,requestId,expectedRevision,id:requestId,draft:core.validateTariffDraft(body.draft)};
 if(action==='restore_default')return {action,requestId,expectedRevision,id:null,draft:null};
 if(!uuid.test(body.id??''))throw Error('invalid_version');
 return {action,requestId,expectedRevision,id:body.id,draft:null};
}
export async function handle(request,env,{fetcher=(...args)=>fetch(...args)}={}){
 const url=new URL(request.url);
 if(url.origin!==origin)return reply({ok:false,code:'DEV_ONLY'},404);
 if(!['GET','POST'].includes(request.method))return reply({ok:false,code:'METHOD'},405);
 if(request.method==='POST'&&(request.headers.get('Origin')!==origin||!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')??'')))return reply({ok:false,code:'ORIGIN_OR_CONTENT'},403);
 const auth=await authorize(request,env,fetcher);
 if(!auth.actor)return reply({ok:false,code:auth.status===503?(auth.code??'AUTH_UNAVAILABLE'):'NOT_AUTHORIZED',...(Number.isInteger(auth.httpStatus)?{httpStatus:auth.httpStatus}:{})},auth.status);
 const db=env.TARIFFS_DEV;
 if(!db)return reply({ok:false,code:'STORAGE_UNAVAILABLE'},503);
 try{
  if(request.method==='GET')return reply({ok:true,state:await state(db)});
  const reader=request.body?.getReader();
  if(!reader)return reply({ok:false,code:'INVALID_COMMAND'},400);
  let bytes=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192){await reader.cancel();return reply({ok:false,code:'TOO_LARGE'},413);}chunks.push(value);}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  let c;try{c=command(JSON.parse(new TextDecoder().decode(buffer)));}catch{return reply({ok:false,code:'INVALID_COMMAND'},400);}
  const s=await state(db);
  if(s.revision!==c.expectedRevision||s.revision>=1000)return reply({ok:false,code:'REFRESH_REQUIRED'},409);
  if(c.action==='save'&&s.versions.some(x=>sameTariff(x.draft,c.draft)))return reply({ok:false,code:'DUPLICATE_TARIFF'},409);
  if(c.action==='save'&&s.versions.length>=200)return reply({ok:false,code:'VERSION_LIMIT'},409);
  const v=s.versions.find(x=>x.id===c.id);
  if((c.action==='approve'&&v?.state!=='salvo')||(c.action==='activate'&&(v?.state!=='aprovado'||s.active===c.id))||(c.action==='restore_default'&&s.active===null))return reply({ok:false,code:'INVALID_TRANSITION'},409);
  try{
   const r=await db.prepare('INSERT INTO tariff_events(request_id,action,version_id,expected_seq,actor_id,draft_json) VALUES(?,?,?,?,?,?)').bind(c.requestId,c.action,c.id,c.expectedRevision,auth.actor,c.draft?JSON.stringify(c.draft):null).run();
   if(!r.success)throw Error('write_failed');
  }catch{return reply({ok:false,code:'WRITE_NOT_CONFIRMED_REFRESH'},409);}
  return reply({ok:true,state:await state(db)});
 }catch{return reply({ok:false,code:'STORAGE_ERROR_REFRESH'},503);}
}
export function onRequest(context){return handle(context.request,context.env);}
