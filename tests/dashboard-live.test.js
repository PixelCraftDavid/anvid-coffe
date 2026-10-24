import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {dashboardRevision,parseDashboardRevision} from '../server/dashboardLive.js';
import {recordSale,voidSale} from '../server/salesStore.js';
import {drawDailyCoupon,writeReview,campaignDay} from '../server/coffeeStore.js';
import {dashboardChanges,adminDashboard,redeemCoupon} from '../server/redemption.js';
import {createTestCoupon} from '../server/testCoupons.js';
import {mergeDashboardPatch,mergeReviewHead} from '../src/admin/liveModel.js';
import {createDashboardSync} from '../src/admin/dashboardSync.js';

const revision={v:2,day:'2027-03-01',seconds:100,nanos:0,id:'AAAAAAAAAAAAAAAAAAAA',sales:'AAAAAAAAAAAAAAAAAAAA',reviews:'AAAAAAAAAAAAAAAAAAAA',coupons:'AAAAAAAAAAAAAAAAAAAA'};
test('sincronización: cursor acotado y validado, sin aceptar cantidades ambiguas',()=>{
  assert.deepEqual(parseDashboardRevision(JSON.stringify(revision)),revision);
  for(const value of ['invalid',JSON.stringify({...revision,sales:-1}),JSON.stringify({...revision,reviews:1.5}),JSON.stringify({...revision,coupons:'1'}),'x'.repeat(257)])assert.throws(()=>parseDashboardRevision(value),{status:400});
});
test('sincronización: sin novedades hace una sola consulta acotada y no lee datos del negocio',async()=>{
  let reads=0;const query={orderBy(){return this;},startAfter(){return this;},limit(n){assert.equal(n,51);return this;},async get(){reads++;return {empty:true,size:0,docs:[]};}};
  const db={collection(name){assert.equal(name,'dashboardEvents');return query;},doc(){assert.fail('No business document read expected');}};
  const result=await dashboardChanges(db,JSON.stringify(revision),new Date('2027-03-01T18:00:00Z'));assert.equal(result.unchanged,true);assert.equal(reads,1);
});
test('sincronización: cambios parciales conservan páginas y rechazan respuestas antiguas',()=>{
  const coupons=Array.from({length:30},(_,index)=>({code:String(index)}));
  const previous={revision,coupons,nextCursor:'old-cursor',summary:{average:4,today:2},sales:{today:10},activity:[{day:revision.day,count:2}],activityYear:{days:[{day:revision.day,count:2}],total:2,activeDays:1}};
  const result=mergeDashboardPatch(previous,{revision:{...revision,seconds:101,coupons:'BBBBBBBBBBBBBBBBBBBB'},summary:{today:3},coupons:[{code:'0',redeemedAt:'now'},{code:'new'}],nextCursor:'new-cursor',activityDay:{day:revision.day,count:3}});
  assert.equal(result.sales,previous.sales);assert.equal(result.summary.average,4);assert.equal(result.activityYear.total,3);assert.equal(result.coupons.length,31);assert.equal(result.coupons[0].redeemedAt,'now');assert.equal(result.nextCursor,'old-cursor');
  assert.equal(mergeDashboardPatch(result,{revision,summary:{today:1}}),result);
});
test('opiniones: un nuevo encabezado conserva las páginas leídas e identifica cada comentario',()=>{
  const reviews=Array.from({length:30},(_,i)=>({id:String(i),updatedAt:`2027-01-${String(30-i).padStart(2,'0')}`,comment:'original'}));
  const next=mergeReviewHead({reviews,nextCursor:'older'}, {count:31,reviews:[{id:'new',updatedAt:'2027-03-01'},{...reviews[0],comment:'editado'}],nextCursor:'head'});
  assert.equal(next.reviews.length,31);assert.equal(next.reviews[0].id,'new');assert.equal(next.reviews[1].comment,'editado');assert.equal(next.nextCursor,'older');
});
function clock(){let next=0;const timers=new Map();return {timers,setTimer(fn,delay){const id=++next;timers.set(id,{fn,delay});return id;},clearTimer(id){timers.delete(id);},async first(){const entry=[...timers].sort((a,b)=>a[1].delay-b[1].delay)[0];assert.ok(entry);timers.delete(entry[0]);await entry[1].fn();}};}
test('sincronización: pausa oculta, una petición a la vez y desconexión sin aplicar datos',async()=>{
  const time=clock(),statuses=[];let visible=true,calls=0,resolve,changes=0,signal;
  const sync=createDashboardSync({...time,getRevision:()=>revision,eligible:()=>visible,onStatus:s=>statuses.push(s),onExpired:()=>assert.fail('Unexpected expiry'),onChange:()=>changes++,request:(_,s)=>{calls++;signal=s;return new Promise(done=>resolve=done);}});
  sync.start();const running=time.first();await Promise.resolve();sync.wake();await time.first();assert.equal(calls,1);
  visible=false;sync.pause();assert.equal(signal.aborted,true);resolve({unchanged:true});await running;assert.equal(changes,0);assert.equal(time.timers.size,0);
  visible=true;sync.wake();const second=time.first();await Promise.resolve();resolve({unchanged:true});await second;assert.equal(calls,2);assert.equal(statuses.at(-1),'live');assert.equal([...time.timers.values()][0].delay,8000);sync.stop();assert.equal(time.timers.size,0);
});
test('sincronización: reintento con espera creciente y cierre inmediato al caducar sesión',async()=>{
  const time=clock();let expired=0,unauthorized=false;const statuses=[];
  const sync=createDashboardSync({...time,getRevision:()=>revision,eligible:()=>true,onStatus:s=>statuses.push(s),onChange:()=>assert.fail('No data expected'),onExpired:()=>expired++,request:async()=>{const error=new Error('network');if(unauthorized)error.status=401;throw error;}});
  sync.start();await time.first();assert.equal(statuses.at(-1),'retry');assert.equal([...time.timers.values()][0].delay,16000);
  unauthorized=true;await time.first();assert.equal(expired,1);assert.equal(time.timers.size,0);
});
test('sincronización: una carga inicial fallida se recupera sin pedir una actualización manual',async()=>{
  const time=clock();let calls=0;const sync=createDashboardSync({...time,getRevision:()=>null,eligible:()=>true,onStatus:()=>{},onExpired:()=>{},request:()=>assert.fail('No revision yet'),onChange:async result=>{assert.equal(result.requiresSnapshot,true);calls++;if(calls===1)throw new Error('Offline initial load');}});
  sync.start();await time.first();assert.equal([...time.timers.values()][0].delay,16000);await time.first();assert.equal(calls,2);assert.equal([...time.timers.values()][0].delay,8000);sync.stop();
});
const emulator=/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'');
const app=emulator?initializeApp({projectId:`demo-anvid-live-${Date.now()}`},'live-tests'):null,db=app?getFirestore(app):null;
after(async()=>{if(app){await db.terminate();await deleteApp(app);}});
const person=value=>createHash('sha256').update(value).digest('hex');
const now=new Date('2027-03-01T18:00:00Z'),day=campaignDay(now);
test('Firestore live: venta/anulación atómicas, reintentos únicos y consulta sin cambios pequeña',{skip:!emulator},async()=>{
  const before=await dashboardRevision(db,day),input={requestId:randomUUID(),quantity:1,locationId:'utvm'};
  await Promise.all(Array.from({length:8},()=>recordSale(db,input,now)));
  const changed=await dashboardChanges(db,JSON.stringify(before),now);assert.deepEqual(changed.changed,['sales']);assert.notEqual(changed.revision.sales,before.sales);assert.equal((await db.collection('dashboardEvents').where('topic','==','sales').get()).size,1);assert.equal(changed.patch.sales.today.revenueCents,3000);assert.equal(changed.patch.activityYear,undefined);assert.equal(changed.patch.coupons,undefined);
  assert.equal((await dashboardChanges(db,JSON.stringify(changed.revision),now)).unchanged,true);
  await Promise.all(Array.from({length:8},()=>voidSale(db,input.requestId,now)));assert.equal((await db.collection('dashboardEvents').where('topic','==','sales').get()).size,2);
});
test('Firestore live: reseñas, tarjetas y canjes notifican; TEST y reintentos quedan aislados',{skip:!emulator},async()=>{
  const before=await dashboardRevision(db,day),id=person('live-person');
  await writeReview(db,id,{rating:4,comment:'Comentario local'},now);await writeReview(db,id,{rating:4,comment:'Comentario local'},now);
  const reviewChange=await dashboardChanges(db,JSON.stringify(before),now);assert.deepEqual(reviewChange.changed,['reviews']);assert.equal(reviewChange.patch.summary.average,4);assert.equal((await db.collection('dashboardEvents').where('topic','==','reviews').get()).size,1);assert.equal(reviewChange.patch.sales,undefined);
  const draw=await drawDailyCoupon(db,id,{now,random:()=>1});await drawDailyCoupon(db,id,{now});
  const drawChange=await dashboardChanges(db,JSON.stringify(reviewChange.revision),now);assert.deepEqual(drawChange.changed,['coupons']);assert.equal(drawChange.patch.activityDay.count,1);assert.equal(drawChange.patch.summary.prizeAvailable,false);assert.equal(drawChange.patch.activityYear,undefined);
  await redeemCoupon(db,draw.coupon.code,now);const after=await dashboardRevision(db,day);assert.equal((await db.collection('dashboardEvents').where('topic','==','coupons').get()).size,2);
  const trial=await createTestCoupon(db,now);await redeemCoupon(db,trial.code,now);assert.deepEqual(await dashboardRevision(db,day),after);
});
test('Firestore live: nueva fecha pide snapshot y el snapshot incluye una revisión previa a sus consultas',{skip:!emulator},async()=>{
  assert.equal((await dashboardChanges(db,JSON.stringify({...revision,day:'2027-02-28'}),now)).requiresSnapshot,true);
  const dashboard=await adminDashboard(db,now);assert.deepEqual(dashboard.revision,await dashboardRevision(db,day));assert.equal(dashboard.summary.today,1);
});
