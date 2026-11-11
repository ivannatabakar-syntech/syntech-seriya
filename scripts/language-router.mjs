export function normalizeLanguage(value){
 const code=String(value||'').trim().toLowerCase().split(/[-_]/)[0];
 return code==='ua'?'uk':['uk','ru','en'].includes(code)?code:null;
}
export function resolveLanguageURL(href,base,currentLanguage=null){
 const url=new URL(href),parts=base.split('/').filter(Boolean),prefix='/'+parts.join('/')+(parts.length?'/':'');
 const relative=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length):'';
 const pathLanguage=normalizeLanguage(relative.split('/')[0]);
 const queryLanguage=normalizeLanguage(url.searchParams.get('lang'));
 const selected=queryLanguage||pathLanguage||'ru';
 const nextPath=prefix+selected+'/';
 if(currentLanguage===selected&&url.pathname===nextPath&&(!url.searchParams.has('lang')||url.searchParams.get('lang')===selected))return null;
 url.pathname=nextPath;
 if(url.searchParams.has('lang'))url.searchParams.set('lang',selected);
 return url.href===href?null:url.href;
}
