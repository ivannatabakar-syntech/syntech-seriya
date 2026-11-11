// Network calls are mocked: tests never submit to the live webhook.
globalThis.fetch=async()=>new Response('',{status:202});
import worker from '../dist/server/index.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let saved=[];const env={CREATIO_WEBHOOK_URL:'https://example.test/webhook',BUCKET:{put:async(k,v)=>saved.push({key:k,data:JSON.parse(v)})}};
const origin='https://game.local';
const page=await worker.fetch(new Request(origin),env);assert.equal(page.status,200);const html=await page.text();
assert.ok(html.includes('Syntech Manufacturing'));assert.ok(html.includes('Начать смену'));assert.ok(html.includes('prefers-reduced-motion'));assert.ok(!html.includes('/* APP */'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Static IDs must be unique');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];new vm.Script(script);
const paths=new Set([...html.split('<script>')[0].matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m=>m[1]));for(const path of paths){let r=await worker.fetch(new Request(origin+path),env);assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>100)}
for(const file of ['production-gantt.png','warehouse-movements.png','shift-calendar.png','quality-inspection.png','serial-label.png'])assert.equal((await worker.fetch(new Request(origin+'/assets/'+file),env)).status,200);
const req=(d,headers={})=>new Request(origin+'/api/leads',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(d)});
const valid={name:'Тест',company:'Example Test Co',email:'qa@example.com',team:'21–50',software:'ERP',consent:'on',source:'linkedin'};
assert.equal((await worker.fetch(req({}),env)).status,400);
assert.equal((await worker.fetch(req({...valid,consent:undefined}),env)).status,400);
assert.equal((await worker.fetch(req({...valid,email:'invalid'}),env)).status,400);
assert.equal((await worker.fetch(req(valid,{origin:'https://evil.local'}),env)).status,403);
assert.equal((await worker.fetch(req(valid,{'content-type':'text/plain'}),env)).status,415);
assert.equal((await worker.fetch(req(valid),{})).status,503);
const good=await worker.fetch(req(valid),env);assert.equal(good.status,201);assert.equal((await good.json()).ok,true);assert.equal(saved.length,2);assert.equal(saved[0].data.consentVersion,'syntech-demo-v2');assert.equal(saved[0].data.campaign,'syntech_seriya');assert.ok(saved[0].key.startsWith('leads/'));
assert.equal((await worker.fetch(new Request(origin+'/api/leads'),env)).status,405);assert.equal((await worker.fetch(new Request(origin+'/private-leads'),env)).status,404);assert.equal((await worker.fetch(new Request(origin,{method:'HEAD'}),env)).status,200);
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../src/game-data.js',import.meta.url),'utf8')+';globalThis.ms=missions',sandbox);const ms=sandbox.ms;assert.equal(ms.length,5);
let routes=0;function walk(step,days,budget,quality){if(step===5){let score=Math.round(days/14*30+budget*.3+quality*.4);assert.ok(score>=0&&score<=100);routes++;return}for(const c of ms[step].choices){assert.equal(c[2].length,3);assert.ok(c[3].length>20);walk(step+1,Math.max(0,days+c[2][0]),Math.max(0,budget+c[2][1]),Math.max(0,Math.min(100,quality+c[2][2])));}}
walk(0,14,100,95);assert.equal(routes,243);console.log('PASS: built page and JS, unique IDs, every image, 243 routes, score bounds, lead validation + consent + persistence, private route isolation');
