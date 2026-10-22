const palette={top:['#282f2b','#174f3c','#23754f','#41aa69','#a2e792'],front:['#282f2b','#123e30','#1b5b3e','#338552','#7eb570'],side:['#282f2b','#164b38','#206c48','#3b9a5f','#91d183']};
const degrees=Math.PI/180;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// The existing UI curve, cubic-bezier(.23,1,.32,1), solved once per frame.
function easeOut(value){let t=value;for(let i=0;i<5;i++){const inverse=1-t,x=3*inverse*inverse*t*.23+3*inverse*t*t*.32+t*t*t,derivative=3*inverse*inverse*.23+6*inverse*t*(.32-.23)+3*t*t*(1-.32);t=clamp(t-(x-value)/derivative,0,1);}return 1-Math.pow(1-t,3);}
const label=new Intl.DateTimeFormat('es-MX',{month:'short',timeZone:'UTC'});

export function activityModel(data) {
  const lead=(new Date(`${data.start}T12:00:00Z`).getUTCDay()+6)%7;
  const max=Math.max(1,...data.days.map(day=>day.count||0));
  const months=[];
  const cells=data.days.map((day,index)=>{
    const position=lead+index;
    if(index===0||day.day.endsWith('-01'))months.push({column:Math.floor(position/7),text:label.format(new Date(`${day.day}T12:00:00Z`)).replace('.','')});
    return {...day,index,column:Math.floor(position/7),row:position%7,level:day.count?clamp(Math.ceil(day.count/max*4),1,4):0,height:day.count?8+Math.sqrt(day.count/max)*54:0};
  });
  return {cells,months,columns:Math.ceil((lead+cells.length)/7)};
}

export function activityProjection(model,width,height,pose) {
  const boardWidth=Math.max(660,width-60),gap=4,cell=(boardWidth-(model.columns-1)*gap)/model.columns;
  const boardHeight=7*cell+6*gap;
  const progress=clamp(pose.progress,0,1),cosZ=Math.cos(pose.yaw*progress*degrees),sinZ=Math.sin(pose.yaw*progress*degrees),cosX=Math.cos(pose.pitch*progress*degrees),sinX=Math.sin(pose.pitch*progress*degrees);
  const rotate=(x,y,z)=>{const horizontal=x*cosZ-y*sinZ,vertical=x*sinZ+y*cosZ;return {x:horizontal,y:vertical*cosX-z*sinX,z:vertical*sinX+z*cosX};};
  const isoX=Math.cos(pose.pitch*degrees),isoY=Math.sin(pose.pitch*degrees),isoZ=Math.cos(pose.yaw*degrees),isoS=Math.sin(pose.yaw*degrees);
  const isoWidth=Math.abs(boardWidth*isoZ)+Math.abs(boardHeight*isoS);
  const isoHeight=(Math.abs(boardWidth*isoS)+Math.abs(boardHeight*isoZ))*isoX+62*isoY;
  const targetScale=Math.min(.9,(width-48)/isoWidth,(height-44)/isoHeight);
  const scale=1+(targetScale-1)*progress;
  const panMax=Math.max(0,boardWidth-width+38);
  const flatX=panMax?width-boardWidth/2-19+clamp(pose.pan,0,panMax):width/2;
  const centerX=flatX+(width/2-flatX)*progress;
  const centerY=height/2+31*sinX*scale;
  const point=(x,y,z=0)=>{const rotated=rotate(x,y,z);return {x:centerX+rotated.x*scale,y:centerY+rotated.y*scale,z:rotated.z};};
  return {boardWidth,boardHeight,cell,gap,scale,progress,panMax,point,rotate};
}

function quad(ctx,points){ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<4;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();}
function contains(points,x,y){let sign=0;for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4];const cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(Math.abs(cross)<.001)continue;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);}return true;}

export function drawActivity(ctx,model,width,height,pose,selected) {
  const projection=activityProjection(model,width,height,pose);
  const {cell,gap,boardWidth,boardHeight,point,rotate,progress}=projection;
  ctx.clearRect(0,0,width,height);
  const tiles=model.cells.map(day=>{
    const x=day.column*(cell+gap)-boardWidth/2,y=day.row*(cell+gap)-boardHeight/2,z=day.height*progress;
    const top=[point(x,y,z),point(x+cell,y,z),point(x+cell,y+cell,z),point(x,y+cell,z)];
    const front=[top[2],top[3],point(x,y+cell),point(x+cell,y+cell)];
    const side=[top[1],top[2],point(x+cell,y+cell),point(x+cell,y)];
    return {day,top,front,side,order:rotate(x+cell/2,y+cell/2,0).z};
  });
  // A single batched path paints the entire inactive floor. Only days with
  // activity need three faces; no DOM/GPU layer is created for an individual day.
  ctx.beginPath();for(const tile of tiles)if(!tile.day.count)quad(ctx,tile.top);
  ctx.fillStyle=palette.top[0];ctx.fill();ctx.strokeStyle='#3a453d';ctx.lineWidth=.6;ctx.stroke();
  const active=tiles.filter(tile=>tile.day.count>0).sort((a,b)=>a.order-b.order);
  for(const tile of active){
    if(progress>.001){ctx.beginPath();quad(ctx,tile.front);ctx.fillStyle=palette.front[tile.day.level];ctx.fill();ctx.beginPath();quad(ctx,tile.side);ctx.fillStyle=palette.side[tile.day.level];ctx.fill();}
    ctx.beginPath();quad(ctx,tile.top);ctx.fillStyle=palette.top[tile.day.level];ctx.fill();ctx.strokeStyle='#d7e6d32b';ctx.stroke();
  }
  for(const tile of tiles)if(tile.day.count===null){ctx.beginPath();quad(ctx,tile.top);ctx.setLineDash([2,2]);ctx.strokeStyle='#718776';ctx.stroke();ctx.setLineDash([]);}
  if(selected!==null&&tiles[selected]){ctx.beginPath();quad(ctx,tiles[selected].top);ctx.lineWidth=1.2;ctx.strokeStyle='#e2f2d8';ctx.stroke();}
  ctx.fillStyle='#adbead';ctx.font='9px "DM Sans",sans-serif';ctx.textBaseline='bottom';
  for(const month of model.months){const location=point(month.column*(cell+gap)-boardWidth/2,-boardHeight/2-11+(boardHeight+24)*progress);ctx.fillText(month.text,location.x,location.y);}
  if(progress<.2){ctx.globalAlpha=1-progress*5;for(const [row,text] of [[0,'lun'],[2,'mié'],[4,'vie']]){const location=point(-boardWidth/2-27,row*(cell+gap)-boardHeight/2+cell);ctx.fillText(text,location.x,location.y);}ctx.globalAlpha=1;}
  return {projection,tiles,active};
}

export function createActivityRenderer(canvas,model,options={}) {
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return null;
  const raf=options.raf||requestAnimationFrame,cancel=options.cancel||cancelAnimationFrame,now=options.now||(()=>performance.now());
  let width=0,height=0,dpr=1,frame=0,visible=true,disposed=false,reduced=!!options.reducedMotion,transition=null,target=false,selected=model.cells.length-1,geometry=null;
  const pose={progress:0,pitch:52,yaw:26,pan:0};
  const metrics={draws:0,maxMs:0,lastMs:0};
  function publish(){Object.assign(canvas.dataset,{renderer:'canvas-2d',drawCount:String(metrics.draws),lastDrawMs:metrics.lastMs.toFixed(2),maxDrawMs:metrics.maxMs.toFixed(2),animating:String(!!transition),pixelRatio:String(dpr)});}
  function sample(time){if(!transition)return;const ratio=clamp((time-transition.start)/280,0,1);pose.progress=transition.from+(transition.to-transition.from)*easeOut(ratio);if(ratio===1)transition=null;}
  function queue(){if(!frame&&visible&&!disposed&&width>1&&height>1)frame=raf(render);}
  function render(time){frame=0;if(disposed||!visible)return;sample(time);const begin=now();ctx.setTransform(dpr,0,0,dpr,0,0);geometry=drawActivity(ctx,model,width,height,pose,selected);metrics.lastMs=now()-begin;metrics.maxMs=Math.max(metrics.maxMs,metrics.lastMs);metrics.draws++;if(transition)queue();else publish();}
  return {
    resize(w,h,ratio=1){const nextDpr=clamp(ratio,1,1.5);if(width===w&&height===h&&dpr===nextDpr)return;width=w;height=h;dpr=nextDpr;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);queue();},
    setDepth(value){sample(now());target=value;const end=value?1:0;if(reduced||Math.abs(pose.progress-end)<.0001){pose.progress=end;transition=null;}else transition={from:pose.progress,to:end,start:now()};queue();},
    setReduced(value){reduced=value;if(value){pose.progress=target?1:0;transition=null;}queue();},
    setVisible(value){visible=value;if(!value){if(frame)cancel(frame);frame=0;pose.progress=target?1:0;transition=null;publish();}else queue();},
    drag(pitch,yaw){pose.pitch=clamp(pitch,20,70);pose.yaw=clamp(yaw,-35,60);queue();},
    pan(value){pose.pan=clamp(value,0,geometry?.projection.panMax||0);queue();},
    select(index,ensureVisible=false){if(selected===index&&!ensureVisible)return;selected=clamp(index,0,model.cells.length-1);if(ensureVisible&&!target){const view=activityProjection(model,width,height,pose);const day=model.cells[selected],x=day.column*(view.cell+view.gap)-view.boardWidth+width-19+pose.pan;if(x<35)pose.pan=clamp(pose.pan+35-x,0,view.panMax);else if(x>width-35)pose.pan=clamp(pose.pan-(x-width+35),0,view.panMax);}queue();},
    hit(x,y){if(!geometry)return null;const {active,tiles}=geometry;for(let i=active.length-1;i>=0;i--){const tile=active[i];if(contains(tile.top,x,y)||pose.progress>.01&&(contains(tile.front,x,y)||contains(tile.side,x,y)))return tile.day.index;}for(let i=tiles.length-1;i>=0;i--)if(contains(tiles[i].top,x,y))return tiles[i].day.index;return null;},
    reset(){pose.pitch=52;pose.yaw=26;queue();},
    pose(){return {...pose};},
    metrics(){return {...metrics,pending:!!frame,animating:!!transition};},
    dispose(){disposed=true;if(frame)cancel(frame);frame=0;transition=null;},
  };
}
