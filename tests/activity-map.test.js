import test from 'node:test';
import assert from 'node:assert/strict';
import {activityModel,activityProjection,drawActivity,createActivityRenderer} from '../src/admin/activityMapRenderer.js';

const days=Array.from({length:365},(_,i)=>({day:new Date(Date.UTC(2025,9,22+i)).toISOString().slice(0,10),count:i>357?i-357:0}));
const model=activityModel({start:days[0].day,days});
function context(){const calls={fills:0};return {calls,setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){calls.fills++;},stroke(){},setLineDash(){},fillText(){}};}
function fixture(reducedMotion=false){let clock=0,id=0;const jobs=new Map(),ctx=context(),canvas={dataset:{},getContext:()=>ctx};const renderer=createActivityRenderer(canvas,model,{now:()=>clock,raf:callback=>{jobs.set(++id,callback);return id;},cancel:key=>jobs.delete(key),reducedMotion});return {canvas,renderer,jobs,tick(ms=16){clock+=ms;const batch=[...jobs.values()];jobs.clear();batch.forEach(callback=>callback(clock));},advance(ms){clock+=ms;},finish(){for(let i=0;i<60&&jobs.size;i++)this.tick();assert.equal(jobs.size,0);}};}

test('mapa: preserva los 365 días, columnas semanales y elevación según los datos',()=>{
  assert.equal(model.cells.length,365);assert.equal(model.columns,53);assert.equal(model.cells[0].row,2);
  assert.equal(model.cells.at(-1).day,'2026-10-21');assert.equal(model.cells.at(-1).row,2);
  assert.equal(model.cells[0].height,0);assert.ok(model.cells.at(-1).height>model.cells[358].height);
});
test('mapa: la proyección 3D cabe en celular y escritorio sin perder polígonos',()=>{
  for(const [width,height] of [[346,240],[1320,370]]){
    const ctx=context(),geometry=drawActivity(ctx,model,width,height,{progress:1,pitch:52,yaw:26,pan:0},364);
    assert.equal(geometry.tiles.length,365);
    for(const tile of geometry.tiles)for(const point of [...tile.top,...tile.front,...tile.side]){assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));assert.ok(point.x>=0&&point.x<=width);assert.ok(point.y>=0&&point.y<=height);}
    assert.ok(ctx.calls.fills<30,'Empty days must share one floor path, not three faces each');
  }
});
test('mapa: solo un frame pendiente, sin bucle en reposo, y resolución limitada',()=>{
  const fx=fixture();fx.renderer.resize(380,240,3);fx.finish();assert.equal(fx.canvas.width,570);assert.equal(fx.canvas.height,360);
  assert.equal(fx.renderer.metrics().animating,false);
  for(let i=0;i<200;i++)fx.renderer.drag(40+i*.01,20+i*.01);
  assert.equal(fx.jobs.size,1);const before=fx.renderer.metrics().draws;fx.tick();assert.equal(fx.renderer.metrics().draws,before+1);assert.equal(fx.jobs.size,0);
  fx.renderer.setDepth(true);fx.finish();assert.equal(fx.renderer.pose().progress,1);assert.equal(fx.canvas.dataset.animating,'false');assert.equal(fx.jobs.size,0);
  fx.renderer.dispose();
});
test('mapa: invertir la transición conserva el punto actual y ocultarlo cancela el trabajo',()=>{
  const fx=fixture();fx.renderer.resize(380,240);fx.finish();fx.renderer.setDepth(true);fx.tick(80);
  const halfway=fx.renderer.pose().progress;assert.ok(halfway>0&&halfway<1);
  fx.renderer.setDepth(false);assert.equal(fx.renderer.pose().progress,halfway);fx.finish();assert.equal(fx.renderer.pose().progress,0);
  fx.renderer.setDepth(true);fx.renderer.setVisible(false);assert.equal(fx.jobs.size,0);assert.equal(fx.renderer.metrics().animating,false);fx.renderer.setVisible(true);fx.finish();assert.equal(fx.renderer.pose().progress,1);
  fx.renderer.setDepth(false);fx.renderer.dispose();assert.equal(fx.jobs.size,0);
});
test('mapa: movimiento reducido cambia en un frame y el selector encuentra el día visible',()=>{
  const fx=fixture(true);fx.renderer.resize(380,240);fx.finish();
  const geometry=drawActivity(context(),model,380,240,{progress:0,pitch:52,yaw:26,pan:0},364);
  const top=geometry.tiles.at(-1).top,x=top.reduce((sum,p)=>sum+p.x,0)/4,y=top.reduce((sum,p)=>sum+p.y,0)/4;
  assert.equal(fx.renderer.hit(x,y),364);fx.renderer.setDepth(true);fx.tick();assert.equal(fx.jobs.size,0);assert.equal(fx.renderer.pose().progress,1);
  const view=activityProjection(model,380,240,{progress:0,pitch:52,yaw:26,pan:0});assert.ok(view.panMax>0);fx.renderer.dispose();
});
