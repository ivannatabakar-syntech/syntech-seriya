import {readFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=new URL('../_site/',import.meta.url);const index=await readFile(new URL('index.html',root),'utf8');assert.ok(index.includes('location.replace'));
for(const lang of ['ru','uk','en']){
 const html=await readFile(new URL(lang+'/index.html',root),'utf8');assert.ok(html.includes('<html lang="'+lang+'">'));assert.ok(!html.includes("fetch('/api/leads',"));assert.ok(html.includes('https://launch-control-demo-game.vinousapple1.chatgpt.site/api/leads')||process.env.LEAD_API_URL);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));const script=scripts.find(s=>s.includes('const currentLang='));assert.ok(script);assert.ok(script.includes('url.pathname='));
 const base=JSON.parse(script.match(/const pagesBase=("[^"]*")/)[1]);
 for(const match of html.split('<script>')[0].matchAll(/src="([^"]*\/assets\/[^"?]+)"/g)){
  const filepath=match[1].slice(base.length);assert.ok(filepath.startsWith('assets/'));await access(new URL(filepath,root));
 }
 assert.ok(!html.includes('webhooks.creatio.com/webhooks/'));assert.ok(!html.includes('CREATIO_WEBHOOK_URL'));
}
console.log('PASS: Pages export, language routes, project asset paths, separate API, no webhook secret in static files');
