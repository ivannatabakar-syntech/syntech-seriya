import worker from '../dist/server/index.js';
import assert from 'node:assert/strict';
const endpoint='https://example.test/creatio-webhook';
const origin='https://game.local';const records=new Map();const calls=[];let mode='ok';
// The real endpoint is never contacted by these checks.
globalThis.fetch=async(url,options)=>{calls.push({url,options,payload:JSON.parse(options.body)});if(mode==='throw')throw Error('simulated offline');return new Response('',{status:mode==='fail'?503:202})};
const env={CREATIO_WEBHOOK_URL:endpoint,BUCKET:{put:async(k,v)=>records.set(k,JSON.parse(v)),get:async k=>records.has(k)?{json:async()=>structuredClone(records.get(k))}:null}};
const valid={requestId:crypto.randomUUID(),name:'Example Person',company:'Example Test Company',phone:'+380501234567',email:'qa@example.com',team:'21–50',software:'excel',consent:'on',language:'en',submittedFrom:origin+'/?lang=en&utm_source=linkedin&utm_campaign=demo#result',attribution:{utm_source:'linkedin',utm_campaign:'demo'}};
const request=d=>new Request(origin+'/api/leads',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(d)});
let response=await worker.fetch(request(valid),env);assert.equal(response.status,201);assert.equal((await response.json()).ok,true);assert.equal(calls.length,1);
const call=calls[0];assert.equal(call.url,endpoint);assert.equal(call.options.method,'POST');assert.equal(call.options.headers['Content-Type'],'application/json');assert.equal(call.options.headers['Idempotency-Key'],valid.requestId);assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);
assert.deepEqual(Object.keys(call.payload).sort(),['name','company','phone','email','formType','tracking'].sort());assert.equal(call.payload.formType,'consultation');assert.equal(call.payload.company,valid.company);assert.equal(call.payload.phone,valid.phone);assert.equal(call.payload.tracking.submitted_from,valid.submittedFrom.split('#')[0]);assert.ok(Number.isFinite(Date.parse(call.payload.tracking.submitted_at)));
assert.equal(records.get('leads/requests/'+valid.requestId+'.json').delivery.status,'delivered');
// Repeating the same successful request does not send a second webhook.
assert.equal((await worker.fetch(request(valid),env)).status,201);assert.equal(calls.length,1);
assert.equal((await worker.fetch(request({...valid,email:'different@example.com'}),env)).status,409);assert.equal(calls.length,1);
const failed={...valid,requestId:crypto.randomUUID(),phone:''};mode='fail';response=await worker.fetch(request(failed),env);assert.equal(response.status,502);assert.deepEqual(await response.json(),{ok:false,saved:true,requestId:failed.requestId});assert.equal(records.get('leads/requests/'+failed.requestId+'.json').delivery.status,'failed');assert.equal(records.get('leads/requests/'+failed.requestId+'.json').delivery.httpStatus,503);assert.equal(records.get('leads/requests/'+failed.requestId+'.json').delivery.errorCode,'upstream_http_503');
const originalDate=calls.at(-1).payload.tracking.submitted_at;mode='ok';assert.equal((await worker.fetch(request(failed),env)).status,201);assert.equal(calls.at(-1).payload.tracking.submitted_at,originalDate);assert.equal(records.get('leads/requests/'+failed.requestId+'.json').delivery.attempts,2);
mode='throw';assert.equal((await worker.fetch(request({...valid,requestId:crypto.randomUUID()}),env)).status,502);
const count=calls.length;for(const bad of [{company:''},{phone:'not a phone'},{submittedFrom:'https://other.local/'},{requestId:'invalid'}])assert.equal((await worker.fetch(request({...valid,...bad}),env)).status,400);assert.equal(calls.length,count);
const page=await (await worker.fetch(new Request(origin+'/?lang=en'),env)).text();assert.ok(!page.includes('webhooks.creatio.com/webhooks/'));assert.ok(page.includes('name="company"'));assert.ok(page.includes('name="phone"'));assert.ok(page.includes('Request sent.'));
const accepted={...valid,requestId:crypto.randomUUID()};mode='ok';let writes=0;const receiptFailure={...env,BUCKET:{get:async()=>null,put:async()=>{if(++writes===2)throw Error('simulated receipt storage outage')}}};assert.equal((await worker.fetch(request(accepted),receiptFailure)).status,201);
console.log('PASS: exact webhook schema, same-origin tracking, timestamp, private endpoint, delivered/failed states, retry deduplication, no real network submissions');
