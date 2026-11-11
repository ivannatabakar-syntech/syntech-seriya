// Network calls are mocked: tests never submit to the live webhook.
globalThis.fetch=async()=>new Response('',{status:202});
import worker from '../dist/server/index.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const origin='https://game.local';
let baseline;
for(const lang of ['ru','uk','en']){
 const page=await worker.fetch(new Request(origin+'/?lang='+lang),{});assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('<html lang="'+lang+'">'));assert.ok(!html.includes('id="downloadReport"'));assert.ok(!html.includes('id="shareResult"'));assert.ok(!html.includes('class="brand-mark"'));assert.ok(html.includes('class="language-switch"'));assert.ok(html.includes('class="map-discover"'));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 const script=html.split('<script>')[1].split('</script>')[0];new vm.Script(script);if(lang==='en')assert.ok(!/[А-Яа-яЁёІіЇїЄє]/.test(script),'English game and form must be fully translated');
 const sandbox={};vm.createContext(sandbox);vm.runInContext(script.split('let state=')[0]+';globalThis.data={missions,meta,products}',sandbox);assert.equal(sandbox.data.missions.length,5);assert.equal(sandbox.data.meta.length,5);assert.equal(sandbox.data.products.length,5);
 const deltas=JSON.stringify(sandbox.data.missions.map(m=>m.choices.map(c=>c[2])));if(baseline)assert.equal(deltas,baseline);else baseline=deltas;
 const anchors=[...html.split('<script>')[0].matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/g)];for(const [,href] of anchors){if(href==='#main'||href.startsWith('mailto:'))continue;const url=new URL(href,origin);assert.equal(url.searchParams.get('utm_source'),'seriya_game');assert.equal(url.searchParams.get('utm_medium'),'interactive');assert.equal(url.searchParams.get('utm_campaign'),'syntech_seriya');assert.ok(url.searchParams.get('utm_content'));if(url.hostname==='syntechmanufacturing.com')assert.ok(url.pathname.startsWith('/'+lang+'/'));}
 assert.ok(html.includes(lang==='en'?'Take the controls.':lang==='uk'?'Візьміть керування у свої руки.':'Возьмите управление в свои руки.'));
}
// Exercise the same attribution functions used by the browser against representative links.
const source=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');const begin=source.indexOf("const utmKeys=");const end=source.indexOf('\ndecorateLinks();',begin);const code=source.slice(begin,end);
const memory=new Map();const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
function anchor(raw,track){return {raw,dataset:track?{track}:{},id:'',classList:{contains:()=>false},getAttribute(){return this.raw},get href(){return this.raw},set href(v){this.raw=v}}}
const links=[anchor('https://syntechmanufacturing.com/uk/defence?existing=kept'),anchor('#how'),anchor('mailto:info@syntech.digital'),anchor('https://syntechmanufacturing.com/uk/contact')];
const ctx={URL,URLSearchParams,currentLang:'en',sessionStorage:storage,location:{search:'?utm_source=linkedin&utm_medium=paid_social&utm_campaign=demo_launch&utm_content=post_a&utm_term=coo',href:origin+'/?lang=en',origin},document:{querySelectorAll:()=>links}};vm.createContext(ctx);vm.runInContext(code+';decorateLinks();globalThis.read=readAttribution;globalThis.decorate=decorateLinks;',ctx);
for(const link of [links[0],links[1],links[3]]){const u=new URL(link.href);assert.equal(u.searchParams.get('utm_source'),'linkedin');assert.equal(u.searchParams.get('utm_campaign'),'demo_launch');assert.equal(u.searchParams.get('utm_term'),'coo');assert.ok(u.searchParams.get('utm_content'))}
assert.notEqual(new URL(links[0].href).searchParams.get('utm_content'),new URL(links[3].href).searchParams.get('utm_content'));assert.equal(new URL(links[0].href).pathname,'/en/defence');assert.equal(new URL(links[0].href).searchParams.get('existing'),'kept');assert.equal(new URL(links[1].href).hash,'#how');assert.equal(links[2].href,'mailto:info@syntech.digital');
ctx.location.search='?lang=uk';assert.equal(ctx.read().utm_source,'linkedin');assert.equal(ctx.read().utm_content,'post_a');ctx.decorate();assert.equal(ctx.read().utm_campaign,'demo_launch');
let saved;const env={CREATIO_WEBHOOK_URL:'https://example.test/webhook',BUCKET:{put:async(k,v)=>{saved=JSON.parse(v)}}};
for(const lang of ['ru','uk','en']){const r=await worker.fetch(new Request(origin+'/api/leads',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({name:'QA',company:'Example Test Co',email:'qa@example.com',team:'1–20',software:'excel',consent:'on',language:lang,campaign:'demo_launch',entryPoint:'resultDemo',source:'linkedin',attribution:{utm_source:'linkedin',utm_medium:'paid_social',utm_campaign:'demo_launch',utm_content:'post_a',utm_term:'coo'}})}),env);assert.equal(r.status,201);assert.equal(saved.language,lang);assert.equal(saved.campaign,'demo_launch');assert.equal(saved.entryPoint,'resultDemo');assert.equal(saved.attribution.utm_content,'post_a')}
console.log('PASS: 3 complete locales, same game logic, removed controls, Syntech logo, route cues, all web links tagged, attribution survives language changes, localized lead storage');
