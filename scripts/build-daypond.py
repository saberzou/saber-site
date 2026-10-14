from pathlib import Path
from html import escape as e
import json

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "daypond/content.json").read_text())

def url(lang,page=''):
    return '/daypond/'+('' if lang=='en' else lang.lower()+'/')+(page+'/' if page else '')
for lang,d in data.items():
 for page in ['', 'support','privacy']:
    idx=['','support','privacy'].index(page)
    languages=''.join(f'<a href="{url(l,page)}" lang="{l}" hreflang="{l}"'+(' aria-current="page"' if l==lang else '')+f'>{label}</a>' for l,label in [('en','EN'),('zh-Hans','简体'),('ja','日本語'),('es','ES')])
    nav=''.join(f'<a href="{url(lang,p)}"'+(' aria-current="page"' if page==p else '')+f'>{e(d["nav"][i])}</a>' for i,p in enumerate(['','support','privacy']))
    title='Daypond — '+d['nav'][idx]
    desc=d['intro' if page=='' else page+'intro']
    if page=='':
      headline=e(d['headline']).replace('\n','<br>')
      sections=''.join(f'<section class="feature"><span class="number">0{i+1}</span><div><p class="tab-name">{e(tab)}</p><h3>{e(h)}</h3><p>{e(body)}</p></div></section>' for i,(tab,h,body) in enumerate(d['features']))
      main=f'''<section class="hero"><div class="hero-copy"><h1>{headline}</h1><p class="intro">{e(d['intro'])}</p><p class="availability">{e(d['soon'])}</p><p class="device">{e(d['device'])}</p><a class="button" href="#experience">{e(d['explore'])} <span aria-hidden="true">↓</span></a></div><figure><img src="/daypond/assets/app-icon.png" alt="Daypond" width="1024" height="1024"><figcaption>{e(d['caption'])}</figcaption></figure></section><section id="experience" class="experience"><h2>{e(d['flowtitle'])}</h2><p class="section-intro">{e(d['flowintro'])}</p><div class="features">{sections}</div></section><section class="closing"><h2>{e(d['closing'])}</h2><p>{e(d['closebody'])}</p><a href="{url(lang,'support')}">{e(d['helplink'])} <span aria-hidden="true">↗</span></a></section>'''
    elif page=='support':
      faq=''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q,a in d['faq'])
      main=f'''<article class="document"><h1>{e(d['supporttitle'])}</h1><p class="intro">{e(desc)}</p><section class="contact"><h2>{e(d['contact'])}</h2><p>{e(d['contactbody'])}</p><a class="button" href="mailto:saberzou@gmail.com?subject=Daypond%20Support">saberzou@gmail.com <span aria-hidden="true">↗</span></a></section><div class="faq">{faq}</div></article>'''
    else:
      policy=''.join(f'<section id="section-{i+1}"><h2>{i+1}. {e(h)}</h2><p>{e(body)}</p></section>' for i,(h,body) in enumerate(d['policy']))
      main=f'''<article class="document policy"><h1>{e(d['privacytitle'])}</h1><p class="intro">{e(desc)}</p><p class="device">{e(d['effectiveDate'])}</p>{policy}<p><a href="mailto:saberzou@gmail.com?subject=Daypond%20Privacy">saberzou@gmail.com</a></p></article>'''
    alternates=''.join(f'<link rel="alternate" hreflang="{l}" href="https://saberzou.ai{url(l,page)}">' for l in data)
    html=f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'"><title>{e(title)}</title><meta name="description" content="{e(desc,quote=True)}"><link rel="canonical" href="https://saberzou.ai{url(lang,page)}">{alternates}<link rel="alternate" hreflang="x-default" href="https://saberzou.ai{url('en',page)}"><link rel="icon" href="/daypond/assets/app-icon.png"><link rel="stylesheet" href="/daypond/daypond.css"></head><body><a class="skip" href="#main">{e(d['skip'])}</a><header><div class="brandline"><a class="portfolio" href="/">Saber Zou <span aria-hidden="true">/</span></a><a class="brand" href="{url(lang)}">Daypond</a><nav class="languages" aria-label="{e(d['language'])}">{languages}</nav></div><nav class="pages" aria-label="Daypond">{nav}</nav></header><main id="main">{main}</main><footer><p>{e(d['footer'])} <span>· {e(d['review'])}</span></p><nav aria-label="Footer">{nav}</nav></footer></body></html>'''
    out=root/url(lang,page).lstrip('/')/'index.html'
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
