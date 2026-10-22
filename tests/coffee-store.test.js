import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { campaignDay, nextReset, drawDailyCoupon, readState, writeReview, listReviews, validateReview } from '../server/coffeeStore.js';
import { getParticipant, requireSameOrigin } from '../server/session.js';
import handler from '../api/experience.js';
import { ensureActivityDay, activityYear } from '../server/activityStore.js';

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
  const outcomes=await Promise.all(Array.from({length:20},(_,n)=>drawDailyCoupon(db,person(n),{now,random:()=>4})));
  assert.equal(outcomes.filter(o=>o.coupon.won).length,1);
  assert.equal(new Set(outcomes.map(o=>o.coupon.code)).size,20);
  const persisted=await db.collection('coupons').where('day','==','2026-10-21').get();
  assert.equal(persisted.size,20);assert.equal(persisted.docs.filter(row=>row.data().won).length,1);
  assert.deepEqual(persisted.docs.map(row=>row.data().attempt).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
  assert.equal(persisted.docs.find(row=>row.data().won).data().attempt,4);
  for(const outcome of outcomes){assert.equal(outcome.coupon.createdAt,now.toISOString());if(outcome.coupon.won)assert.equal(outcome.coupon.wonAt,now.toISOString());}
  const prior=outcomes[0];const retry=await drawDailyCoupon(db,person(0),{now,random:()=>assert.fail('No debe volver a sortear')});
  assert.deepEqual(retry.coupon,prior.coupon);assert.equal(retry.isNew,false);
  assert.equal((await readState(db,person(0),now)).coupon.code,prior.coupon.code);
  assert.equal((await db.doc('dailyActivity/2026-10-21').get()).data().count,20);
});
test('Firestore: el siguiente día tiene un cupo nuevo y perder no lo consume', {skip:!useEmulator},async()=>{
  const now=new Date('2026-10-22T06:00:00Z');
  assert.equal((await drawDailyCoupon(db,person('loss'),{now,random:()=>2})).coupon.won,false);
  assert.equal((await drawDailyCoupon(db,person('winner'),{now,random:()=>assert.fail('La posición ya está guardada')})).coupon.won,true);
  assert.equal((await drawDailyCoupon(db,person('later'),{now})).coupon.won,false);
  const schedules=await db.getAll(db.doc('dailyDraws/2026-10-21'),db.doc('dailyDraws/2026-10-22'));
  assert.deepEqual(schedules.map(row=>row.data().winningAttempt),[4,2]);
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

test('Firestore: el mapa anual migra cupones anteriores y no duplica participaciones', {skip:!useEmulator},async()=>{
  const day='2026-10-19',now=new Date(`${day}T18:00:00Z`);
  for(let i=1;i<=2;i++)await db.doc(`coupons/${day}_${person(`legacy-${i}`)}`).set({code:`ANV-${String(i).repeat(12)}`,day,won:false,createdAt:Timestamp.fromDate(now),wonAt:null});
  await Promise.all(Array.from({length:8},()=>ensureActivityDay(db,day)));
  const outcomes=await Promise.all(Array.from({length:10},(_,i)=>drawDailyCoupon(db,person(`activity-${i}`),{now,random:(_min,max)=>max-1})));
  await drawDailyCoupon(db,person('activity-0'),{now});
  assert.equal((await db.doc(`dailyActivity/${day}`).get()).data().count,12);
  assert.equal(outcomes.filter(value=>value.isNew).length,10);
  const year=await activityYear(db,'2026-10-22');
  assert.equal(year.days.length,365);assert.equal(year.days.at(-1).day,'2026-10-22');
  assert.equal(year.days.find(item=>item.day===day).count,12);
  assert.equal(year.days.find(item=>item.day==='2026-10-20').count,0);
  assert.equal(year.days.find(item=>item.day==='2026-10-21').count,20);
  assert.equal(year.total,35);assert.equal(year.activeDays,3);assert.equal(year.incomplete,false);
});

test('Firestore: cualquiera de las 15 posiciones gana exactamente una vez y no se vuelve a sortear', {skip:!useEmulator},async()=>{
  for(let position=1;position<=15;position++){
    const day=`2027-01-${String(position).padStart(2,'0')}`,now=new Date(`${day}T18:00:00Z`);
    const outcomes=[];
    for(let attempt=1;attempt<=17;attempt++){
      const random=(min,max)=>{assert.equal(attempt,1);assert.equal(min,1);assert.equal(max,16);return position;};
      outcomes.push(await drawDailyCoupon(db,person(`${day}-${attempt}`),{now,random}));
    }
    assert.deepEqual(outcomes.map((value,i)=>value.coupon.won?i+1:null).filter(Boolean),[position]);
    assert.ok(outcomes.every(value=>value.isNew));
    assert.equal((await db.doc(`dailyDraws/${day}`).get()).data().winningAttempt,position);
    assert.equal((await db.doc(`dailyActivity/${day}`).get()).data().count,17);
    assert.equal((await db.doc(`dailyPrizes/${day}`).get()).data().code,outcomes[position-1].coupon.code);
    // Neither the winning position nor the attempt counter is public.
    assert.ok(outcomes.every(value=>!('winningAttempt' in value)&&!('winningAttempt' in value.coupon)&&!('attempt' in value.coupon)));
    const state=await readState(db,person(`${day}-${position}`),now);
    assert.equal(state.coupon.won,true);assert.equal('winningAttempt' in state,false);
  }
});

test('Firestore: repetir simultáneamente una tarjeta no consume posiciones ni mueve el premio', {skip:!useEmulator},async()=>{
  const day='2027-02-01',now=new Date(`${day}T18:00:00Z`),participant=person('duplicate-draw');
  const outcomes=await Promise.all(Array.from({length:12},()=>drawDailyCoupon(db,participant,{now,random:()=>2})));
  assert.equal(outcomes.filter(value=>value.isNew).length,1);
  assert.equal(new Set(outcomes.map(value=>value.coupon.code)).size,1);
  assert.ok(outcomes.every(value=>!value.coupon.won));
  assert.equal((await db.doc(`dailyActivity/${day}`).get()).data().count,1);
  const winner=await drawDailyCoupon(db,person('duplicate-next'),{now,random:()=>assert.fail('No debe mover el premio')});
  assert.equal(winner.coupon.won,true);
});

async function seedLegacyDay(day,count,{winner=0}={}){
  const createdAt=Timestamp.fromDate(new Date(`${day}T18:00:00Z`));
  const coupons=Array.from({length:count},(_,index)=>({code:`ANV-${String(index+1).padStart(12,'0')}`,day,won:index+1===winner,createdAt,wonAt:index+1===winner?createdAt:null}));
  const refs=coupons.map((_,index)=>db.doc(`coupons/${day}_${person(`legacy-${day}-${index}`)}`));
  const batch=db.batch();coupons.forEach((coupon,index)=>batch.create(refs[index],coupon));
  if(winner)batch.create(db.doc(`dailyPrizes/${day}`),{code:coupons[winner-1].code,couponId:refs[winner-1].id,wonAt:createdAt});
  await batch.commit();return {refs,coupons,now:createdAt.toDate()};
}

test('Firestore: al actualizar a mitad del día conserva las tarjetas y sortea entre las posiciones restantes', {skip:!useEmulator},async()=>{
  const day='2027-02-02';const {refs,coupons,now}=await seedLegacyDay(day,3);
  const outcomes=[];
  for(let attempt=4;attempt<=16;attempt++){
    outcomes.push(await drawDailyCoupon(db,person(`migration-${attempt}`),{now,random:(min,max)=>{assert.equal(attempt,4);assert.equal(min,4);assert.equal(max,16);return 9;}}));
  }
  assert.deepEqual(outcomes.map((value,i)=>value.coupon.won?i+4:null).filter(Boolean),[9]);
  assert.deepEqual((await db.getAll(...refs)).map(row=>row.data()),coupons);
  assert.equal((await db.doc(`dailyActivity/${day}`).get()).data().count,16);
});

test('Firestore: si 15 tarjetas antiguas ya perdieron, el siguiente intento nuevo gana sin modificar el pasado', {skip:!useEmulator},async()=>{
  const day='2027-02-03';const {refs,coupons,now}=await seedLegacyDay(day,15);
  const random=()=>assert.fail('No quedan posiciones antiguas disponibles');
  assert.equal((await drawDailyCoupon(db,person('after-fifteen'),{now,random})).coupon.won,true);
  assert.equal((await drawDailyCoupon(db,person('after-migration-winner'),{now,random})).coupon.won,false);
  assert.equal((await db.doc(`dailyDraws/${day}`).get()).data().winningAttempt,16);
  assert.deepEqual((await db.getAll(...refs)).map(row=>row.data()),coupons);
});

test('Firestore: un premio anterior a la actualización impide cualquier ganador adicional', {skip:!useEmulator},async()=>{
  const day='2027-02-04';const {refs,coupons,now}=await seedLegacyDay(day,2,{winner:1});
  for(let attempt=3;attempt<=16;attempt++)assert.equal((await drawDailyCoupon(db,person(`already-won-${attempt}`),{now,random:()=>assert.fail('El premio ya fue asignado')})).coupon.won,false);
  assert.deepEqual((await db.getAll(...refs)).map(row=>row.data()),coupons);
  assert.equal((await db.doc(`dailyActivity/${day}`).get()).data().count,16);
});
