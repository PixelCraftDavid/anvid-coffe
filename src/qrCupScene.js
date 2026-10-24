// A bounded voxel scene over a real QR texture. No 3D engine or idle loop.
import {qrColors} from './qrPalette.js';
export function cupProjection(x,y,z,progress,width,height){
  const yaw=-.5*progress,pitch=1.02*progress,scale=Math.min(width,height)*(.75-.13*progress);
  return [width*(.5-.02*progress)+(x*Math.cos(yaw)+z*Math.sin(yaw))*scale,height*(.5+.13*progress)+((-x*Math.sin(yaw)+z*Math.cos(yaw))*Math.cos(pitch)+y*Math.sin(pitch))*scale];
}
export function voxelCoffee(modules){
  const cells=[],unit=1/32;
  function add(x,z,bottom,top,color,side='#d7c393'){cells.push({x:x*unit,z:z*unit,bottom,top,size:unit,color,side});}
  // A hollow square rim, coffee surface, stepped foot, and a voxel handle.
  for(let x=-6;x<6;x++)for(let z=-6;z<6;z++){
    const edge=x===-6||x===5||z===-6||z===5;
    const bit=modules.get(Math.max(0,Math.min(modules.size-1,Math.floor((z+16)/32*modules.size))),Math.max(0,Math.min(modules.size-1,Math.floor((x+16)/32*modules.size))));
    const foam=!edge&&((x===-2||x===1)&&z===-1||x>=-2&&x<=1&&z===0||x>=-1&&x<=0&&z===1);
    add(x,z,edge?.065:0,edge?.54:foam?.465:.45,edge?(bit?'#e7d1a2':qrColors.cream):foam?'#efc98b':bit?qrColors.espresso:qrColors.caramel,x===-6||x===5?qrColors.sage:'#e3cea1');
  }
  for(let x=6;x<11;x++)for(let z=-1;z<=0;z++){add(x,z,.4,.47,'#eee0b9','#b9cba0');add(x,z,.14,.21,'#e9d8ad','#a6bd8d');if(x>=9)add(x,z,.21,.4,'#ecdbb0','#b2c496');}
  // A few low beans and plants keep the platform a coffee scene, not a box.
  for(const [cx,cz] of [[-11,10],[-9,11],[10,9],[9,-10]])for(let x=0;x<2;x++)for(let z=0;z<3;z++)add(cx+x,cz+z,0,.035+(z===1?.025:0),'#78502b','#51391f');
  for(const [x,z] of [[-12,-10],[-11,-10],[-12,-9],[12,10],[12,11],[13,11]])add(x,z,0,.045+((x+z)%3+3)%3*.022,'#91a96a','#628452');
  for(const [x,z,h] of [[-2,-1,.66],[-1,-1,.72],[0,-1,.79],[0,-2,.85]])add(x,z,h,h+.03,'#f5edcf','#ddd6b7');
  return cells.sort((a,b)=>(a.z+a.x*.55)-(b.z+b.x*.55));
}
export function renderQrCup(ctx,texture,progress,width,height,cells=[]){
  ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  const project=(x,y,z)=>cupProjection(x,y,z,progress,width,height);
  function face(points,color){ctx.beginPath();points.forEach(([x,y,z],i)=>{const point=project(x,y,z);i?ctx.lineTo(...point):ctx.moveTo(...point);});ctx.closePath();ctx.fillStyle=color;ctx.fill();}
  if(progress>0){
    ctx.globalAlpha=progress;ctx.fillStyle='#153b2a18';ctx.beginPath();ctx.ellipse(width*.49,height*.79,width*.34,height*.065,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    face([[-.5,0,.5],[.5,0,.5],[.5,.035*progress,.5],[-.5,.035*progress,.5]],'#d8cfac');
    face([[.5,0,-.5],[.5,0,.5],[.5,.035*progress,.5],[.5,.035*progress,-.5]],'#a5b492');
  }
  const a=project(-.5,0,-.5),b=project(.5,0,-.5),c=project(-.5,0,.5);
  ctx.save();ctx.transform((b[0]-a[0])/texture.width,(b[1]-a[1])/texture.width,(c[0]-a[0])/texture.height,(c[1]-a[1])/texture.height,a[0],a[1]);ctx.drawImage(texture,0,0);ctx.restore();
  if(progress>0){ctx.globalAlpha=progress*.76;face([[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]],qrColors.paper);ctx.globalAlpha=1;}
  if(progress<=0)return;
  ctx.globalAlpha=Math.min(1,progress*4);
  for(const cell of cells){
    const x=cell.x,z=cell.z,s=cell.size,y=-cell.top*progress,bottom=-cell.bottom*progress;
    face([[x,y,z+s],[x+s,y,z+s],[x+s,bottom,z+s],[x,bottom,z+s]],cell.side);
    face([[x+s,y,z],[x+s,y,z+s],[x+s,bottom,z+s],[x+s,bottom,z]],cell.side==='#e3cea1'?'#c7b489':cell.side);
    face([[x,y,z],[x+s,y,z],[x+s,y,z+s],[x,y,z+s]],cell.color);
  }
  ctx.globalAlpha=1;
}
export function createCupMotion({draw,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,clock=()=>performance.now()}){
  let value=0,target=0,frame=0,start=0,from=0,disposed=false;
  function tick(now){frame=0;if(disposed)return;const t=Math.min(1,(now-start)/280),e=1-(1-t)**4;value=from+(target-from)*e;draw(value);if(t<1)frame=requestFrame(tick);}
  return {to(next,instant=false){cancelFrame(frame);frame=0;target=next;from=value;start=clock();if(instant){value=target;draw(value);}else frame=requestFrame(tick);},pause(){cancelFrame(frame);frame=0;value=target;},redraw(){draw(value);},dispose(){disposed=true;cancelFrame(frame);},get value(){return value;}};
}
