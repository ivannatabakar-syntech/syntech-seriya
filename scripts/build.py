from pathlib import Path
import base64,json,mimetypes,re,subprocess,sys
root=Path(__file__).resolve().parent.parent
src=root/'src'
subprocess.run([sys.executable,str(root/'scripts/generate-world.py')],cwd=root,check=True)
def world(prefix):
 markup=(src/'world.svg').read_text()
 for ident in re.findall(r'\bid="([^"]+)"',markup):
  markup=markup.replace('id="'+ident+'"','id="'+prefix+'-'+ident+'"').replace('url(#'+ident+')','url(#'+prefix+'-'+ident+')')
 return markup
html=(src/'page.html').read_text().replace('/* STYLES */',(src/'style.css').read_text()).replace('<!-- WORLD -->',world('home'),1).replace('<!-- WORLD -->',world('game'),1).replace('/* APP */',(src/'game-data.js').read_text()+'\n'+(src/'app.js').read_text())

assets={}
for p in (src/'assets').iterdir():
 if p.is_file():assets['/assets/'+p.name]={'type':mimetypes.guess_type(p)[0] or 'application/octet-stream','data':base64.b64encode(p.read_bytes()).decode()}
translations={}
for line in (src/'i18n/translations.tsv').read_text().splitlines():
 if not line.strip():continue
 parts=line.split('|')
 if len(parts)!=3:raise ValueError('Translation needs 3 columns: '+line[:70])
 if parts[0] in translations:raise ValueError('Duplicate translation: '+parts[0])
 translations[parts[0]]=parts[1:]
pattern=re.compile('|'.join(re.escape(k) for k in sorted(translations,key=len,reverse=True)))
pages={}
for lang in ['ru','uk','en']:
 page=html if lang=='ru' else pattern.sub(lambda m:translations[m.group(0)][0 if lang=='uk' else 1],html)
 page=page.replace('<html lang="ru">','<html lang="'+lang+'">')
 page=page.replace('<script>','<script>const currentLang='+json.dumps(lang)+';',1)
 # Static links already carry UTM tags; runtime links preserve incoming attribution.
 counter=[0]
 def track(m):
  counter[0]+=1
  href=m.group(1)
  if href.startswith(('mailto:','tel:')) or href=='#main':return m.group(0)
  from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
  u=urlsplit(href)
  if u.scheme not in ['', 'http','https']:return m.group(0)
  path=u.path
  if u.netloc=='syntechmanufacturing.com':path=re.sub(r'^/(uk|ru|en)(?=/|$)','/'+lang,path)
  params=dict(parse_qsl(u.query))
  params.update(utm_source='seriya_game',utm_medium='interactive',utm_campaign='syntech_seriya',utm_content='static_'+str(counter[0]))
  if not u.netloc:params['lang']=lang
  return 'href="'+urlunsplit((u.scheme,u.netloc,path,urlencode(params),u.fragment))+'"'
 # Only anchor hrefs, not icon assets.
 page=re.sub(r'<a\b[^>]*>',lambda m:re.sub(r'href="([^"]*)"',track,m.group(0)),page.split('<script>')[0])+('<script>'+page.split('<script>',1)[1])
 pages[lang]=page
code='const pages='+json.dumps(pages,ensure_ascii=False)+';\nconst assets='+json.dumps(assets)+';\n'+(src/'server.js').read_text()
(root/'dist/server').mkdir(parents=True,exist_ok=True)
(root/'dist/server/index.js').write_text(code)
print(f'Built: {len(pages)} languages, {len(assets)} assets, Worker {len(code):,} chars')
