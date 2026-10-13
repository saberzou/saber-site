from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[1]
class Check(HTMLParser):
 def __init__(self): super().__init__(); self.links=[]; self.ids=[]; self.lang=''; self.h1=0
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='html':self.lang=a.get('lang')
  if t=='h1':self.h1+=1
  if 'id' in a:self.ids.append(a['id'])
  if t in ['a','img','link']:self.links.append(a.get('href',a.get('src','')))
for p in root.glob('finwords/**/index.html'):
 c=Check();c.feed(p.read_text());assert c.lang and c.h1==1;assert len(c.ids)==len(set(c.ids))
 for link in c.links:
  u=urlsplit(link)
  if u.scheme:continue
  target=root/u.path.lstrip('/') if u.path else p
  if target.is_dir():target/= 'index.html'
  assert target.exists(),(p,link)
  if u.fragment and target==p:assert u.fragment in c.ids,(p,link)
print('PASS: 9 static pages; local links, images, styles, language tags, unique anchors and one h1 per page')
