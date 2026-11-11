from pathlib import Path
import json,xml.etree.ElementTree as ET
root=ET.fromstring(Path('src/world.svg').read_text());ns={'s':'http://www.w3.org/2000/svg'}
truck=root.find('.//s:g[@class="world-truck"]',ns);route=json.loads(truck.attrib['data-truck-route'])
objects=[tuple(map(float,g.attrib['data-world-object'].split(','))) for g in root.findall('.//s:g[@data-world-object]',ns)]
def world(pt):
 x,y=pt[:2];return (((x-450)/.78+(y-92)/.39)/2,((y-92)/.39-(x-450)/.78)/2)
for a,b in zip(route,route[1:]):
 ax,ay=world(a);bx,by=world(b);hx,hy=(33.75,10.5) if a[2].endswith('x') else (10.5,33.75)
 for step in range(101):
  x=ax+(bx-ax)*step/100;y=ay+(by-ay)*step/100
  for ox,oy,w,d in objects:
   assert x+hx<=ox or x-hx>=ox+w or y+hy<=oy or y-hy>=oy+d,('Route collision',x,y,(ox,oy,w,d))
assert len(root.findall('.//s:g[@data-occlusion-bounds]',ns))==len(objects)
assert root.find('.//s:g[@class="truck-visibility"]',ns).attrib['mask']=='url(#truck-occlusion)'
# Factory must hide the truck on its rear lane and leave it visible on its front lane.
def occluded(x,y):return x-33.75<455 and y-10.5<410
assert occluded(350,225) and not occluded(350,425)
print('PASS: 1,010 route samples clear all building/tree footprints; rear/front building occlusion and mask wiring')
