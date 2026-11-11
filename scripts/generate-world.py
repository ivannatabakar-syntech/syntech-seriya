from pathlib import Path
import math,json,html,re
out=[]
occluders=[]
def begin_object(bounds):
 out.append('<g data-world-object="'+','.join(str(v) for v in bounds)+'">')
 return len(out)-1,bounds
def end_object(marker):
 start,bounds=marker;out.append('</g>')
 shapes=''.join(out[start+1:-1])
 shapes=re.sub(r'<polygon[^>]*opacity="[^"]*"[^>]*/>','',shapes)
 shapes=re.sub(r'(fill|stroke)="(?!none)[^"]*"',lambda m:m.group(1)+'="black"',shapes)
 occluders.append((bounds,shapes))
def p(x,y,z=0):return (450+(x-y)*.78,92+(x+y)*.39-z)
def points(v):return ' '.join(f'{x:.1f},{y:.1f}' for x,y in v)
def poly(v,c,extra=''):out.append(f'<polygon points="{points(v)}" fill="{c}" {extra}/>')
def line(v,c='#7d9ca5',width=1,extra=''):out.append(f'<polyline points="{points(v)}" fill="none" stroke="{c}" stroke-width="{width}" {extra}/>')
def cube(x,y,w,d,h,colors=('#d3e5ea','#b3cbd2','#95b1b8'),z=0):
 poly([p(x,y,z+h),p(x+w,y,z+h),p(x+w,y+d,z+h),p(x,y+d,z+h)],colors[0]);poly([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],colors[1]);poly([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x+w,y,z+h)],colors[2])
def building(x,y,w,d,h,color=('#b8d4db','#8fb1ba','#64838b'),accent='#0b404e'):
 # projected cast shadow
 poly([p(x+20,y+20),p(x+w+45,y+20),p(x+w+45,y+d+25),p(x+20,y+d+25)],'#b4cbd1','opacity=".55"')
 cube(x,y,w,d,h,color)
 cube(x-3,y-3,w+6,d+6,4,('#e1eff3','#a9c6ce','#7899a2'),h)
 for k in range(3):
  xx=x+15+k*(w-25)/3
  poly([p(xx,y+d+0.4,18),p(xx+24,y+d+.4,18),p(xx+24,y+d+.4,h-12),p(xx,y+d+.4,h-12)],'#39494d')
  line([p(xx,y+d+.5,(h+6)/2),p(xx+24,y+d+.5,(h+6)/2)],'#b5d5d1',1.4)
 cube(x+w*.35,y+d*.3,w*.3,d*.35,12,('#eaf3f5','#cddfe4','#b3cbd2'),h+4)
 line([p(x,y+d+1,8),p(x+w,y+d+1,8)],accent,3)
def tree(x,y):
 cube(x-3,y-3,6,6,20,('#697e83','#546c72','#37484d'))
 cube(x-12,y-12,24,24,27,('#abc6ad','#8ca78d','#72947c'),18)
 cube(x-9,y-9,18,18,12,('#c6d9b7','#a1bf9c','#8eae8d'),40)
out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 590" aria-hidden="true"><defs><radialGradient id="glow"><stop stop-color="#f2f8fa" stop-opacity=".9"/><stop offset="1" stop-color="#c8e3ea" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs><ellipse cx="460" cy="360" rx="340" ry="150" fill="#497682" opacity=".13" filter="url(#blur)"/><ellipse cx="460" cy="270" rx="430" ry="280" fill="url(#glow)"/>')
cube(0,0,520,520,20,('#e3edf0','#bbd1d7','#a5bfc6'),-20)
# paving and road
poly([p(0,205),p(520,205),p(520,245),p(0,245)],'#baccd1')
poly([p(200,0),p(240,0),p(240,520),p(200,520)],'#baccd1')
poly([p(0,440),p(520,440),p(520,485),p(0,485)],'#baccd1')
line([p(0,225),p(520,225)],'#f3f7f8',1.5,'stroke-dasharray="9 9"')
line([p(220,0),p(220,520)],'#f3f7f8',1.5,'stroke-dasharray="9 9"')
line([p(0,462),p(520,462)],'#f3f7f8',1.5,'stroke-dasharray="9 9"')
# The route and vehicle share projected ground coordinates in this SVG.
poly([p(455,225),p(495,225),p(495,440),p(455,440)],'#baccd1')
poly([p(200,410),p(495,410),p(495,440),p(200,440)],'#baccd1')
route_world=[(120,225),(220,225),(220,110),(220,225),(475,225),(475,425),(220,425),(220,355),(220,425),(220,462),(235,462)]
route_ground=[p(x,y,0) for x,y in route_world]
line(route_ground,'#8db1ba',2.3,'stroke-dasharray="5 8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="world-route"')
# yard stripes
for y in [32,52,72,92]:line([p(20,y),p(42,y)],'#a7bfc6',1)
# back buildings
obj=begin_object((55,35,130,159))
building(55,35,130,130,58,('#ddc8b2','#c2a58c','#a88874'))
# loading doors and packages
for x in [75,113,150]:cube(x,170,22,24,18,('#e3bf91','#c79b70','#ab7d52'))
# warehouse roof vents
for x in [70,110,150]:cube(x,55,20,50,4,('#74888d','#5a6a6f','#48585c'),64)
end_object(obj)
obj=begin_object((280,40,146,132))
building(280,40,145,132,95,('#badce5','#89b2bd','#678e98'))
# office blue glass side
for yy in [60,90,120]:poly([p(426,yy,18),p(426,yy+20,18),p(426,yy+20,78),p(426,yy,78)],'#8eb8c7')
# antenna
line([p(370,80,115),p(370,80,150)],'#688b94',3)
end_object(obj)
# assembly front right
obj=begin_object((295,265,160,145))
building(295,265,160,145,67,('#c5dbe1','#a3bac0','#7a9399'))
# orange sawtooth roof over factory
for xx in [305,350,395]:
 poly([p(xx,275,74),p(xx+28,275,87),p(xx+28,390,87),p(xx,390,74)],'#8cb6bd')
 poly([p(xx+28,275,87),p(xx+36,275,74),p(xx+36,390,74),p(xx+28,390,87)],'#467c88')
end_object(obj)
# quality lab
obj=begin_object((58,285,125,110))
building(58,285,125,110,58,('#b4d6cb','#8fb8ab','#678c87'),accent='#91c0a3')
# lab roof cylinder approximated
cube(80,305,25,30,14,('#e7f4e8','#c2dbc8','#9fbaa9'),62)
end_object(obj)
# small loading structure
obj=begin_object((275,470,120,32))
building(275,470,120,32,37,('#d8c6ae','#b9a189','#9a816d'))
end_object(obj)
# trees and exterior perimeter
for x,y in [(470,55),(483,110),(475,166),(40,249),(508,310),(508,370),(350,510),(425,470),(40,405),(70,460)]:
 marker=begin_object((x-12,y-12,24,24));tree(x,y);end_object(marker)
# lamps
for x,y in [(250,15),(250,400),(30,205),(505,245)]:
 line([p(x,y),p(x,y,28)],'#6f8d95',2)
 a,b=p(x,y,28);out.append(f'<circle cx="{a}" cy="{b}" r="4" fill="#ffd4a4"/>')
# World-space occlusion mask: only objects in front of the truck hide it.
out.append('<defs><mask id="truck-occlusion" maskUnits="userSpaceOnUse" x="0" y="0" width="900" height="590" style="mask-type:luminance"><rect width="900" height="590" fill="white"/>')
for bounds,shapes in occluders:
 out.append('<g data-occlusion-bounds="'+','.join(str(v) for v in bounds)+'" style="display:none">'+shapes+'</g>')
out.append('</mask></defs><g class="truck-visibility" mask="url(#truck-occlusion)">')
# Moving truck: four real isometric views, all centered on the road route.
route_data=[]
for i,(x,y) in enumerate(route_world):
 if i<len(route_world)-1:
  nx,ny=route_world[i+1];heading=('pos-x' if nx>x else 'neg-x') if nx!=x else ('pos-y' if ny>y else 'neg-y')
 else:heading=route_data[-1][2]
 px,py=p(x,y);route_data.append([round(px,2),round(py,2),heading,1200 if i in [0,2,5,7,10] else 0])
start=route_data[0]
out.append(f'<g class="world-truck" data-truck-route="{html.escape(json.dumps(route_data),quote=True)}" transform="translate({start[0]} {start[1]})">')
for heading in ['neg-x','pos-x','neg-y','pos-y']:
 out.append(f'<g data-heading="{heading}" style="display:{"inline" if heading==start[2] else "none"}"><g transform="scale(.75)"><g transform="translate(-450 -92)">')
 def turn(x,y):
  return {'neg-x':(x,y),'pos-x':(-x,-y),'neg-y':(-y,x),'pos-y':(y,-x)}[heading]
 def truck_box(x,y,w,d,h,colors,z):
  corners=[turn(x,y),turn(x+w,y),turn(x,y+d),turn(x+w,y+d)];left=min(v[0] for v in corners);top=min(v[1] for v in corners)
  cube(left,top,max(v[0] for v in corners)-left,max(v[1] for v in corners)-top,h,colors,z)
 truck_box(-39,-14,84,28,5,('#67797e','#55656a','#435358'),7)
 truck_box(-19,-14,64,28,25,('#faf4e7','#d6c8b5','#b7a38c'),12)
 truck_box(-39,-14,20,28,20,('#397786','#0b404e','#082e39'),9)
 if heading in ['neg-x','pos-x']:
  for x in [-29,31]:
   a,b=p(x,15,6);out.append(f'<ellipse cx="{a}" cy="{b}" rx="4.5" ry="6.5" fill="#3e5156"/>')
 else:
  for y in [-29,31]:
   a,b=p(15,y,6);out.append(f'<ellipse cx="{a}" cy="{b}" rx="4.5" ry="6.5" fill="#3e5156"/>')
 out.append('</g></g></g>')
out.append('</g>')
out.append('</g></svg>')
Path('src/world.svg').write_text(''.join(out))
