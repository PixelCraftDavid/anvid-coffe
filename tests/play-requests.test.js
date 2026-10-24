import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash,createHmac} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createPlayRequest,ownPlayRequest,waitingRequests,requestCode,requestLifetime,authorizeExistingSale,dismissPlayRequest} from '../server/playRequests.js';
import {recordSale,voidSale} from '../server/salesStore.js';
import {passId} from '../server/playPasses.js';
import {purchaseState,drawPurchaseCoupon} from '../server/coffeeStore.js';
import {dashboardChanges} from '../server/redemption.js';
import {dashboardRevision} from '../server/dashboardLive.js';
import {firebaseConnection} from '../server/firebase.js';
import adminHandler from '../api/admin.js';
import experienceHandler from '../api/experience.js';
import {printedGameUrl,displayRequestCode} from '../shared/playAccessConfig.js';

const emulator=/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'');
const app=emulator?initializeApp({projectId:`demo-anvid-access-${Date.now()}`},'play-request-tests'):null,db=app?getFirestore(app):null;
after(async()=>{if(app){await db.terminate();await deleteApp(app);}});
const person=value=>createHash('sha256').update(value).digest('hex'),key=Buffer.from('local-request-test-key');
const options=now=>({now,key,network:'request-tests'}),sale=(code,more={})=>({requestId:randomUUID(),locationId:'utvm',quantity:1,...(code?{requestCode:code}:{}),...more});
const counters=async(database=db)=>Promise.all(['coupons','dailyPrizes','dailyDraws','dailyActivity','sales','reviews'].map(async name=>(await database.collection(name).get()).size));

test('acceso: identificador legible y QR fijo público, sin ruta privada ni pase',()=>{
  assert.equal(requestCode(' abc-123 '),'ABC123');assert.equal(displayRequestCode('ABC123'),'ABC-123');
  for(const value of [null,'','ABCDE','GGG-123','A'.repeat(21),'../ABC123'])assert.throws(()=>requestCode(value),{status:400});
  assert.equal(printedGameUrl,'https://anvid-coffe.vercel.app/#jugar');
});

test('Firestore acceso: crear y recargar no registra ventas ni consume premio; caduca y avisa al panel',{skip:!emulator},async()=>{
  const now=new Date('2028-01-01T18:00:00Z'),buyer=person('waiting'),before=await counters(),revision=await dashboardRevision(db,'2028-01-01');
  const results=await Promise.all(Array.from({length:8},()=>createPlayRequest(db,buyer,options(now))));
  const code=results[0].request.code;assert.ok(results.every(row=>row.request.code===code));
  assert.equal((await ownPlayRequest(db,buyer,now)).request.status,'pending');assert.equal((await ownPlayRequest(db,person('other'),now)).request,null);
  const queue=await waitingRequests(db,null,now);assert.equal(queue.items.length,1);assert.deepEqual(Object.keys(queue.items[0]).sort(),['code','createdAt','expiresAt','status']);
  assert.deepEqual(await counters(),before);
  const changed=await dashboardChanges(db,JSON.stringify(revision),now);assert.deepEqual(changed.changed,['requests']);assert.equal(changed.patch.waiting.items[0].code,code);assert.equal(changed.patch.sales,undefined);
  const later=new Date(now.getTime()+requestLifetime);assert.equal((await ownPlayRequest(db,buyer,later)).request.status,'expired');assert.equal((await waitingRequests(db,null,later)).items.length,0);
  const replacement=await createPlayRequest(db,buyer,options(later));assert.notEqual(replacement.request.code,code);assert.equal((await db.doc(`playRequests/${code}`).get()).data().status,'expired');
  await assert.rejects(()=>recordSale(db,sale(code),later),{status:409});assert.deepEqual(await counters(),before);
});

test('Firestore acceso: cobrar y autorizar es atómico, idempotente y vinculado al navegador',{skip:!emulator},async()=>{
  const now=new Date('2028-01-02T18:00:00Z'),buyer=person('authorize'),request=await createPlayRequest(db,buyer,options(now)),input=sale(request.request.code),before=await counters();
  const results=await Promise.all(Array.from({length:8},()=>recordSale(db,input,now)));assert.equal(results.filter(row=>row.isNew).length,1);
  const token=results[0].passes[0].token;assert.ok(results.every(row=>row.passes[0].token===token));
  const after=await counters();assert.equal(after[4],before[4]+1);assert.deepEqual(after.filter((_,i)=>i!==4),before.filter((_,i)=>i!==4));
  assert.equal((await ownPlayRequest(db,buyer,now)).passToken,token);assert.equal((await createPlayRequest(db,buyer,options(now))).request.code,request.request.code);
  assert.equal((await purchaseState(db,buyer,token)).purchase.status,'available');
  await assert.rejects(()=>purchaseState(db,person('thief'),token),{status:403});await assert.rejects(()=>drawPurchaseCoupon(db,person('thief'),token,{now}),{status:403});
  await assert.rejects(()=>recordSale(db,sale(request.request.code),now),{status:409});
  const first=await drawPurchaseCoupon(db,buyer,token,{now,random:()=>1});assert.equal(first.coupon.won,true);assert.equal((await ownPlayRequest(db,buyer,now)).request.status,'used');
  const again=await drawPurchaseCoupon(db,buyer,token,{now});assert.equal(again.isNew,false);assert.equal(again.coupon.code,first.coupon.code);assert.ok(!JSON.stringify(first).includes(token));
  const next=await createPlayRequest(db,buyer,options(now));assert.notEqual(next.request.code,request.request.code);assert.equal(next.request.status,'pending');
});

test('Firestore acceso: dos cobros disputando un identificador crean una sola venta',{skip:!emulator},async()=>{
  const now=new Date('2028-01-03T18:00:00Z'),{request}=await createPlayRequest(db,person('race'),options(now)),before=(await db.collection('sales').get()).size;
  const results=await Promise.allSettled([recordSale(db,sale(request.code),now),recordSale(db,sale(request.code),now)]);
  assert.equal(results.filter(row=>row.status==='fulfilled').length,1);assert.equal(results.find(row=>row.status==='rejected').reason.status,409);
  assert.equal((await db.collection('sales').get()).size,before+1);
});

test('Firestore acceso: reutilizar venta no suma ingresos ni permite asignar dos veces el mismo intento',{skip:!emulator},async()=>{
  const now=new Date('2028-01-04T18:00:00Z'),saved=await recordSale(db,sale(),now),a=await createPlayRequest(db,person('existing-a'),options(now)),b=await createPlayRequest(db,person('existing-b'),options(now));
  const totals=(await db.doc('dailySales/2028-01-04').get()).data(),results=await Promise.allSettled([authorizeExistingSale(db,a.request.code,saved.sale.id,now),authorizeExistingSale(db,b.request.code,saved.sale.id,now)]);
  assert.equal(results.filter(row=>row.status==='fulfilled').length,1);assert.equal(results.find(row=>row.status==='rejected').reason.status,409);
  const granted=results.find(row=>row.status==='fulfilled').value;assert.equal((await authorizeExistingSale(db,granted.code,saved.sale.id,now)).isNew,false);
  assert.deepEqual((await db.doc('dailySales/2028-01-04').get()).data(),totals);assert.equal((await db.doc(`playPasses/${passId(saved.passes[0].token)}`).get()).data().requestCode,granted.code);
  const legacy=await recordSale(db,sale(),now);await db.doc(`playPasses/${passId(legacy.passes[0].token)}`).delete();await db.doc(`sales/${legacy.sale.id}`).update({passTokens:[]});
  const historic=await createPlayRequest(db,person('historic'),options(now));await authorizeExistingSale(db,historic.request.code,legacy.sale.id,now);
  assert.equal((await ownPlayRequest(db,person('historic'),now)).request.status,'approved');
});

test('Firestore acceso: anular o descartar impide jugar y permite generar otro identificador',{skip:!emulator},async()=>{
  const now=new Date('2028-01-05T18:00:00Z'),buyer=person('voided'),{request}=await createPlayRequest(db,buyer,options(now)),saved=await recordSale(db,sale(request.code),now);
  await voidSale(db,saved.sale.id,now);await assert.rejects(()=>drawPurchaseCoupon(db,buyer,saved.passes[0].token,{now}),{status:409});
  const next=await createPlayRequest(db,buyer,options(now));assert.notEqual(next.request.code,request.code);assert.equal(next.request.status,'pending');
  await assert.rejects(()=>authorizeExistingSale(db,next.request.code,saved.sale.id,now),{status:409});
  const before=await counters();await dismissPlayRequest(db,next.request.code,now);assert.deepEqual(await counters(),before);assert.equal((await ownPlayRequest(db,buyer,now)).request.status,'cancelled');
  await assert.rejects(()=>recordSale(db,sale(next.request.code),now),{status:409});assert.notEqual((await createPlayRequest(db,buyer,options(now))).request.code,next.request.code);
});

test('Firestore acceso: límite de solicitudes por red y ventana sin consumir juegos',{skip:!emulator},async()=>{
  const now=new Date('2028-01-06T18:00:00Z'),window=Math.floor(now.getTime()/requestLifetime),fingerprint=createHmac('sha256',key).update('limited').digest('hex');
  await db.doc(`playRequestLimits/${window}_${fingerprint}`).set({count:60});
  const before=await counters();await assert.rejects(()=>createPlayRequest(db,person('limited'),{now,key,network:'limited'}),{status:429});assert.deepEqual(await counters(),before);
  assert.equal((await createPlayRequest(db,person('limited'),{now:new Date(now.getTime()+requestLifetime),key,network:'limited'})).request.status,'pending');
});

async function api(handler,{method='GET',body,cookie='',url='/api/experience?view=authorization',origin='http://localhost:5174'}={}){
  const headers={};let json;const req={method,body,url,headers:{host:'localhost:5174',origin,'content-type':'application/json',cookie,'x-forwarded-for':'127.42.0.8'}};
  const res={setHeader:(name,value)=>headers[name]=value,end:value=>json=JSON.parse(value)};await handler(req,res);return {status:res.statusCode,json,headers};
}
test('API acceso: sin autorización no juega; datos públicos sin tokens; acciones privadas y origen protegidos',{skip:!emulator},async()=>{
  const password='Only-for-local-tests-2026!',previous=process.env.ANVID_ADMIN_PASSWORD;process.env.ANVID_ADMIN_PASSWORD=password;
  try{
    const local=firebaseConnection().db,before=await counters(local),created=await api(experienceHandler,{method:'POST',body:{action:'requestPlay'}});
    assert.equal(created.status,200);const cookie=created.headers['Set-Cookie'].split(';')[0],code=created.json.request.code;
    assert.equal(created.json.request.status,'pending');assert.equal(created.json.purchase,null);assert.ok(!/passToken|participant|saleId/.test(JSON.stringify(created.json)));
    assert.equal((await api(experienceHandler,{method:'POST',cookie,body:{action:'play'}})).status,403);
    assert.equal((await api(experienceHandler,{method:'POST',cookie,body:{action:'requestPlay'},origin:'https://attacker.test'})).status,403);
    assert.equal((await api(adminHandler,{url:'/api/admin?view=requests'})).status,401);
    for(const action of ['authorizePlay','authorizeExistingSale','dismissPlayRequest'])assert.equal((await api(adminHandler,{method:'POST',url:'/api/admin',body:{action,requestCode:code}})).status,401);
    const login=await api(adminHandler,{method:'POST',url:'/api/admin',body:{action:'login',password}});assert.equal(login.status,200);const adminCookie=login.headers['Set-Cookie'].split(';')[0];
    assert.equal((await api(adminHandler,{method:'POST',cookie:adminCookie,url:'/api/admin',body:{action:'authorizePlay',requestId:randomUUID(),locationId:'utvm'}})).status,400);
    assert.equal((await api(adminHandler,{method:'POST',cookie:adminCookie,url:'/api/admin',origin:'https://attacker.test',body:{action:'authorizePlay',requestCode:code}})).status,403);
    const input={action:'authorizePlay',requestCode:code,requestId:randomUUID(),locationId:'utvm'};
    const authorized=await api(adminHandler,{method:'POST',cookie:adminCookie,url:'/api/admin',body:input});assert.equal(authorized.status,200);
    const state=await api(experienceHandler,{cookie});assert.equal(state.status,200);assert.equal(state.json.purchase.status,'available');assert.ok(!JSON.stringify(state.json).includes(authorized.json.passes[0].token));
    assert.equal((await api(experienceHandler,{method:'POST',body:{action:'passState',token:authorized.json.passes[0].token}})).status,403);
    await voidSale(local,authorized.json.sale.id);
    // Only this fake local sale was added; no real-style draw, review or redemption happened.
    const after=await counters(local);assert.deepEqual(after.filter((_,i)=>i!==4),before.filter((_,i)=>i!==4));
  }finally{if(previous===undefined)delete process.env.ANVID_ADMIN_PASSWORD;else process.env.ANVID_ADMIN_PASSWORD=previous;}
});
