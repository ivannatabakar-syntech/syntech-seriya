function allowedOrigins(env){return new Set(String(env.ALLOWED_FORM_ORIGINS||'').split(',').map(v=>v.trim()).filter(v=>{try{return new URL(v).origin===v&&v.startsWith('https://')}catch{return false}}))}
async function handleRequest(request,env){
 const CREATIO_WEBHOOK=env.CREATIO_WEBHOOK_URL;
 const url=new URL(request.url);const lang=['ru','uk','en'].includes(url.searchParams.get('lang'))?url.searchParams.get('lang'):'ru';const html=pages[lang];
 if(url.pathname==='/api/leads'){
  if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
  if(request.headers.get('origin')!==url.origin&&!allowedOrigins(env).has(request.headers.get('origin')))return new Response('Forbidden',{status:403});
  if(!request.headers.get('content-type')?.includes('application/json'))return new Response('JSON required',{status:415});
  if(Number(request.headers.get('content-length')||0)>20000)return new Response('Too large',{status:413});
  try{
   const raw=await request.text();if(raw.length>20000)return new Response('Too large',{status:413});let d;try{d=JSON.parse(raw)}catch{return new Response('Invalid JSON',{status:400})}
   if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.length>100||typeof d.company!=='string'||!d.company.trim()||d.company.length>200||(d.phone!==undefined&&(typeof d.phone!=='string'||d.phone.length>40||(d.phone.trim()&&!/^\+?[0-9][0-9\s().-]{5,39}$/.test(d.phone.trim()))))||typeof d.email!=='string'||d.email.length>254||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(d.email)||!['1–20','21–50','51–200','201+'].includes(d.team)||!['excel','jira','erp','other','Excel / таблицы','Jira','ERP','Другая система'].includes(d.software)||d.consent!=='on')return new Response('Invalid data',{status:400});
   if(!CREATIO_WEBHOOK)return new Response('Webhook not configured',{status:503});
   if(!env.BUCKET)return new Response('Storage unavailable',{status:503});
   if(d.requestId!==undefined&&(typeof d.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.requestId)))return new Response('Invalid request ID',{status:400});
   const id=d.requestId||crypto.randomUUID(),key='leads/requests/'+id+'.json',createdAt=new Date().toISOString();
   let submittedFrom=new URL('/',url.origin);submittedFrom.searchParams.set('lang',['ru','uk','en'].includes(d.language)?d.language:'ru');
   if(d.submittedFrom!==undefined){try{if(typeof d.submittedFrom!=='string'||d.submittedFrom.length>4096)throw Error();const page=new URL(d.submittedFrom);if(page.origin!==request.headers.get('origin')||page.username||page.password)throw Error();page.hash='';submittedFrom=page}catch{return new Response('Invalid submission page',{status:400})}}
   const payload={name:d.name.trim(),company:d.company.trim(),phone:(d.phone||'').trim(),email:d.email.trim(),formType:'consultation',tracking:{submitted_from:submittedFrom.href,submitted_at:createdAt}};
   const previous=d.requestId&&env.BUCKET.get?await env.BUCKET.get(key):null;
   let record=previous?await previous.json():null;
   if(record){
    if(['name','company','phone','email'].some(k=>record[k]!==payload[k]))return new Response('Request ID conflict',{status:409});
    if(record.delivery?.status==='delivered')return Response.json({ok:true},{status:201,headers:{'Cache-Control':'no-store'}});
   }else{
    record={id,createdAt,name:payload.name,company:payload.company,phone:payload.phone,email:payload.email,team:d.team,software:d.software,consent:true,consentVersion:'syntech-demo-v2',result:d.result||null,campaign:String(d.campaign||'syntech_seriya').slice(0,200),entryPoint:String(d.entryPoint||'demo').slice(0,100),source:String(d.source||'direct').slice(0,150),language:['ru','uk','en'].includes(d.language)?d.language:'ru',attribution:Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].map(k=>[k,String(d.attribution?.[k]||'').slice(0,200)])),webhookPayload:payload};
   }
   record.delivery={status:'pending',attempts:(record.delivery?.attempts||0)+1,attemptedAt:createdAt};
   const save=()=>env.BUCKET.put(key,JSON.stringify(record),{httpMetadata:{contentType:'application/json'}});
   await save();
   try{
    const response=await fetch(CREATIO_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify(record.webhookPayload),signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!response.ok)throw Error('rejected');
    record.delivery.status='delivered';record.delivery.deliveredAt=new Date().toISOString();await save();
    return Response.json({ok:true},{status:201,headers:{'Cache-Control':'no-store'}});
   }catch{
    record.delivery.status='failed';await save();
    return Response.json({ok:false,saved:true},{status:502,headers:{'Cache-Control':'no-store'}});
   }
  }catch{return new Response('Unable to process request',{status:500})}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'};
 if(url.pathname==='/')return new Response(request.method==='HEAD'?null:html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
 const a=assets[url.pathname];if(a){const bytes=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'Content-Type':a.type,'Cache-Control':'public, max-age=3600'}})}
 return new Response('Not found',{status:404,headers});
}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('origin'),allowed=origin&&(origin===url.origin||allowedOrigins(env).has(origin));
 if(url.pathname==='/api/leads'&&request.method==='OPTIONS'){
  if(!allowed)return new Response('Forbidden',{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 const result=await handleRequest(request,env);
 if(url.pathname!=='/api/leads'||!allowed)return result;
 const headers=new Headers(result.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');
 return new Response(result.body,{status:result.status,headers});
}};
