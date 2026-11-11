import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeLanguage,resolveLanguageURL} from './language-router.mjs';
const origin='https://example.github.io',base='/syntech-seriya/';
for(const [value,expected] of [['en','en'],['EN','en'],['en-US','en'],['uk-UA','uk'],['ua','uk'],['ru_RU','ru'],['de',null],['',null]])assert.equal(normalizeLanguage(value),expected);
const cases=[
 ['?lang=en','en',null],['?lang=uk','uk',null],['?lang=ua','uk',null],['?lang=EN','en',null],['?lang=en-US','en',null],
 ['ru/?lang=en','en','ru'],['en/?lang=uk','uk','en'],['ua/','uk',null],['?lang=de','ru',null],['','ru',null],['en/?lang=invalid','en','en']
];
for(const [suffix,expected,current] of cases){const input=origin+base+suffix;const target=resolveLanguageURL(input,base,current);assert.ok(target);const url=new URL(target);assert.equal(url.pathname,base+expected+'/');assert.equal(resolveLanguageURL(target,base,expected),null,'No redirect loops')}
for(const lang of ['ru','uk','en']){assert.equal(resolveLanguageURL(origin+base+lang+'/',base,lang),null);assert.equal(resolveLanguageURL(origin+base+lang+'/?lang='+lang,base,lang),null)}
const campaign=origin+base+'ru/?lang=ua&utm_source=linkedin&utm_campaign=demo#solution';const moved=new URL(resolveLanguageURL(campaign,base,'ru'));assert.equal(moved.searchParams.get('utm_source'),'linkedin');assert.equal(moved.searchParams.get('utm_campaign'),'demo');assert.equal(moved.hash,'#solution');assert.equal(moved.pathname,base+'uk/');
assert.equal(new URL(resolveLanguageURL('https://play.example.com/?lang=en','/')).pathname,'/en/');
// Execute the exact scripts emitted in the static pages with an old saved preference and browser language.
for(const [file,input,expected] of [['index.html','?lang=en','en'],['index.html','?lang=ua','uk'],['ru/index.html','ru/?lang=en','en'],['ua/index.html','ua/','uk']]){
 const html=fs.readFileSync(new URL('../_site/'+file,import.meta.url),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];let redirected;
 const context={URL,location:{href:origin+base+input,replace:u=>{redirected=u}},navigator:{language:'ru-RU'},localStorage:{getItem:()=> 'ru'}};vm.runInNewContext(script,context);assert.equal(new URL(redirected).pathname,base+expected+'/');
}
console.log('PASS: URL language priority, UA alias, regional codes, no browser/storage override, campaign preservation, emitted router and no loops');
