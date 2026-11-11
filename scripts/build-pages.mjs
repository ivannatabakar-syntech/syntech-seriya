import {mkdir,writeFile,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {default:worker}=await import(path.join(root,'dist/server/index.js'));
const [owner,name]=(process.env.GITHUB_REPOSITORY||'example/syntech-seriya').split('/');
const suppliedBase=process.env.PAGES_BASE_PATH??(name.toLowerCase()===owner.toLowerCase()+'.github.io'?'':'/'+name);
const base='/'+suppliedBase.split('/').filter(Boolean).join('/')+(suppliedBase.split('/').filter(Boolean).length?'/':'');
const siteURL=(process.env.PAGES_SITE_URL||'https://'+owner+'.github.io'+base).replace(/\/$/,'');
const api=process.env.LEAD_API_URL||'https://launch-control-demo-game.vinousapple1.chatgpt.site/api/leads';
if(new URL(api).protocol!=='https:')throw Error('LEAD_API_URL must use HTTPS');
const output=path.join(root,'_site');await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const lang of ['ru','uk','en']){
 let html=await (await worker.fetch(new Request('https://build.example/?lang='+lang),{})).text();
 html=html.replaceAll('/assets/',base+'assets/');
 html=html.replace("fetch('/api/leads',",'fetch('+JSON.stringify(api)+',');
 html=html.replace("url.searchParams.set('lang',b.dataset.lang);location.assign(url.href);","url.searchParams.set('lang',b.dataset.lang);url.pathname="+JSON.stringify(base)+"+b.dataset.lang+'/';location.assign(url.href);");
 html=html.replace('const currentLang=', 'const pagesBase='+JSON.stringify(base)+';const currentLang=');
 // Open Graph URLs point at this deployment, not the previous host.
 html=html.replace(/(<meta property="og:image" content=")[^"]*/,'$1'+siteURL+'/assets/team.jpg');
 html=html.replace(/(<meta property="og:url" content=")[^"]*/,'$1'+siteURL+'/'+lang+'/');
 await mkdir(path.join(output,lang),{recursive:true});await writeFile(path.join(output,lang,'index.html'),html);
}
await cp(path.join(root,'src/assets'),path.join(output,'assets'),{recursive:true});
const index='<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syntech Manufacturing</title><script>const u=new URL(location.href);const lang=["uk","ru","en"].includes(u.searchParams.get("lang"))?u.searchParams.get("lang"):"ru";u.pathname='+JSON.stringify(base)+'+lang+"/";location.replace(u.href);</script><a href="'+base+'ru/">Відкрити гру / Open game</a></html>';
await writeFile(path.join(output,'index.html'),index);await writeFile(path.join(output,'.nojekyll'),'');
if(process.env.PAGES_CUSTOM_DOMAIN)await writeFile(path.join(output,'CNAME'),new URL('https://'+process.env.PAGES_CUSTOM_DOMAIN).hostname+'\n');
console.log('Built GitHub Pages with 3 languages at '+base+'; API: '+new URL(api).origin);
