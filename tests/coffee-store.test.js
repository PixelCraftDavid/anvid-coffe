import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { campaignDay, nextReset, drawDailyCoupon, readState, writeReview, listReviews, validateReview } from '../server/coffeeStore.js';
import { getParticipant, requireSameOrigin } from '../server/session.js';
import handler from '../api/experience.js';

test('el día cambia a las 06:00 UTC (medianoche UTC−6)', () => {
  assert.equal(campaignDay(new Date('2026-10-22T05:59:59.999Z')),'2026-10-21');
  assert.equal(campaignDay(new Date('2026-10-22T06:00:00.000Z')),'2026-10-22');
  assert.equal(nextReset(new Date('2026-10-22T05:59:59Z')),'2026-10-22T06:00:00.000Z');
  assert.equal(nextReset(new Date('2026-10-22T06:00:00Z')),'2026-10-23T06:00:00.000Z');
});
test('las reseñas validan estrellas y limitan comentarios', () => {
  for(const rating of [0,6,1.5,'5',null]) assert.throws(()=>validateReview({rating,comment:''}),{status:400});
  assert.throws(()=>validateReview({rating:1,comment:'x'.repeat(601)}),{status:400});
  assert.deepEqual(validateReview({rating:1,comment:'  Amargo  '}),{rating:1,comment:'Amargo'});
});
test('cookies firmadas se restauran; firmas alteradas y unicode no se aceptan', () => {
  const key=Buffer.from('test-key'); const headers={};const res={setHeader:(k,v)=>headers[k]=v};
  const a=getParticipant({headers:{}},res,key);
  const cookie=headers['Set-Cookie'].split(';')[0];
  assert.match(headers['Set-Cookie'],/HttpOnly; SameSite=Lax/);
  assert.equal(getParticipant({headers:{cookie}},res,key),a);
  assert.notEqual(getParticipant({headers:{cookie:cookie.slice(0,-1)+'!'}},res,key),a);
  assert.doesNotThrow(()=>getParticipant({headers:{cookie:cookie.split('.')[0]+'.'+'á'.repeat(43)}},res,key));
});
test('escrituras rechazan otros orígenes y tipos de contenido', () => {
  assert.throws(()=>requireSameOrigin({headers:{host:'anvid.test',origin:'https://otro.test','content-type':'application/json'}}),{status:403});
  assert.throws(()=>requireSameOrigin({headers:{host:'anvid.test',origin:'https://anvid.test','content-type':'text/plain'}}),{status:415});
  assert.doesNotThrow(()=>requireSameOrigin({headers:{host:'anvid.test',origin:'https://anvid.test','content-type':'application/json'}}));
});
test('sin configuración la API no crea premios ni devuelve secretos',async()=>{
  const old=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;const emulator=process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;delete process.env.FIRESTORE_EMULATOR_HOST;
  const headers={};let body;const res={setHeader:(k,v)=>headers[k]=v,end:v=>body=JSON.parse(v)};
  try {await handler({method:'GET',url:'/api/experience',headers:{host:'localhost:5173'}},res);assert.equal(res.statusCode,503);assert.deepEqual(Object.keys(body),['error']);assert.match(headers['Cache-Control'],/no-store/);}
  finally {if(old!==undefined)process.env.FIREBASE_SERVICE_ACCOUNT_JSON=old;if(emulator!==undefined)process.env.FIRESTORE_EMULATOR_HOST=emulator;}
});

const useEmulator=/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'');
const app=useEmulator?initializeApp({projectId:`demo-anvid-test-${Date.now()}`},'store-tests'):null;
const db=app?getFirestore(app):null;
after(async()=>{if(app){await db.terminate();await deleteApp(app);}});
const person=n=>createHash('sha256').update(String(n)).digest('hex');
test('Firestore: 20 sorteos simultáneos entregan un único ganador global', {skip:!useEmulator},async()=>{
  const now=new Date('2026-10-21T18:00:00Z');
  const outcomes=await Promise.all(Array.from({length:20},(_,n)=>drawDailyCoupon(db,person(n),{now,candidateWins:true})));
  assert.equal(outcomes.filter(o=>o.coupon.won).length,1);
  assert.equal(new Set(outcomes.map(o=>o.coupon.code)).size,20);
  const persisted=await db.collection('coupons').where('day','==','2026-10-21').get();
  assert.equal(persisted.size,20);assert.equal(persisted.docs.filter(row=>row.data().won).length,1);
  for(const outcome of outcomes){assert.equal(outcome.coupon.createdAt,now.toISOString());if(outcome.coupon.won)assert.equal(outcome.coupon.wonAt,now.toISOString());}
  const prior=outcomes[0];const retry=await drawDailyCoupon(db,person(0),{now,candidateWins:!prior.coupon.won});
  assert.deepEqual(retry.coupon,prior.coupon);assert.equal(retry.isNew,false);
  assert.equal((await readState(db,person(0),now)).coupon.code,prior.coupon.code);
});
test('Firestore: el siguiente día tiene un cupo nuevo y perder no lo consume', {skip:!useEmulator},async()=>{
  const now=new Date('2026-10-22T06:00:00Z');
  assert.equal((await drawDailyCoupon(db,person('loss'),{now,candidateWins:false})).coupon.won,false);
  assert.equal((await drawDailyCoupon(db,person('winner'),{now,candidateWins:true})).coupon.won,true);
  assert.equal((await drawDailyCoupon(db,person('later'),{now,candidateWins:true})).coupon.won,false);
});
test('Firestore: reseñas públicas, actualizaciones y promedio sin duplicar votos', {skip:!useEmulator},async()=>{
  const now=new Date('2026-10-21T18:00:00Z');
  await Promise.all([writeReview(db,person('review-one'),{rating:1,comment:'Demasiado amargo'},now),writeReview(db,person('review-two'),{rating:5,comment:'Me gustó'},now)]);
  const first=await listReviews(db,person('review-one'));
  assert.equal(first.count,2);assert.equal(first.average,3);assert.equal(first.reviews.filter(r=>r.isMine).length,1);
  await assert.rejects(()=>writeReview(db,person('review-one'),{rating:3,comment:'Cambio'},new Date(now.getTime()+1000)),{status:429});
  await writeReview(db,person('review-one'),{rating:3,comment:'Cambio'},new Date(now.getTime()+16000));
  const next=await listReviews(db,person('review-one'));assert.equal(next.count,2);assert.equal(next.average,4);
  assert.equal(next.reviews.find(r=>r.isMine).createdAt,now.toISOString());
  assert.equal(next.reviews.find(r=>r.isMine).updatedAt,'2026-10-21T18:00:16.000Z');
  const stamp=new Date(now.getTime()+20000);
  await Promise.all(Array.from({length:21},(_,n)=>writeReview(db,person(`page-${n}`),{rating:2,comment:`Opinión ${n}`},stamp)));
  const page=await listReviews(db,person('review-one'));assert.equal(page.reviews.length,20);assert.equal(page.count,23);assert.ok(page.nextCursor);
  const rest=await listReviews(db,person('review-one'),page.nextCursor);assert.equal(rest.reviews.length,3);assert.equal(rest.nextCursor,null);
  assert.equal(new Set([...page.reviews,...rest.reviews].map(r=>r.id)).size,23);
});
