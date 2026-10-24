import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {randomUUID} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import QRCode from 'qrcode';
import {QRCodeReader,BinaryBitmap,HybridBinarizer,RGBLuminanceSource} from '@zxing/library';
import {adminSettings,checkPassword,createAdminSession,requireAdminSession,clearAdminSession,limitAdminLogin} from '../server/adminAuth.js';
import {normalizeCouponCode,inspectCoupon,redeemCoupon,couponPage,adminDashboard} from '../server/redemption.js';
import {drawDailyCoupon} from '../server/coffeeStore.js';
import adminHandler from '../api/admin.js';
import {firebaseConnection} from '../server/firebase.js';
import {createTestCoupon,normalizeTestCode} from '../server/testCoupons.js';

const privateTestPassword='Only-for-local-tests-2026!';
test('contraseña privada obligatoria, comprobación exacta y comparación segura',()=>{
  const previous=process.env.ANVID_ADMIN_PASSWORD;
  try{delete process.env.ANVID_ADMIN_PASSWORD;assert.throws(()=>adminSettings(Buffer.from('test')),{status:503});process.env.ANVID_ADMIN_PASSWORD='corta';assert.throws(()=>adminSettings(Buffer.from('test')),{status:503});process.env.ANVID_ADMIN_PASSWORD=privateTestPassword;assert.ok(adminSettings(Buffer.from('test')).key.length===32);assert.ok(checkPassword(privateTestPassword,privateTestPassword));assert.equal(checkPassword('incorrecta',privateTestPassword),false);assert.equal(checkPassword(null,privateTestPassword),false);}
  finally{if(previous===undefined)delete process.env.ANVID_ADMIN_PASSWORD;else process.env.ANVID_ADMIN_PASSWORD=previous;}
});
test('sesión privada: firma, caducidad, revocación al cambiar clave y cierre',()=>{
  const now=Date.parse('2026-10-21T15:00:00Z'),key=Buffer.from('a-private-test-key');const headers={};const req={headers:{}};const res={setHeader:(k,v)=>headers[k]=v};
  const session=createAdminSession(req,res,key,now),cookie=headers['Set-Cookie'].split(';')[0];
  assert.match(headers['Set-Cookie'],/Path=\/api\/admin; HttpOnly; SameSite=Strict/);
  assert.equal(requireAdminSession({headers:{cookie}},key,now).expiresAt,session.expiresAt);
  assert.throws(()=>requireAdminSession({headers:{}},key,now),{status:401});
  assert.throws(()=>requireAdminSession({headers:{cookie:cookie+'x'}},key,now),{status:401});
  assert.throws(()=>requireAdminSession({headers:{cookie}},Buffer.from('rotated-key'),now),{status:401});
  assert.throws(()=>requireAdminSession({headers:{cookie}},key,now+8*3600000),{status:401});
  clearAdminSession(req,res);assert.match(headers['Set-Cookie'],/Max-Age=0/);
});
test('QR de Anvid: el generador y un lector independiente recuperan el mismo código',()=>{
  const payload='ANVID:ANV-ABCDEF123456';const qr=QRCode.create(payload,{errorCorrectionLevel:'M'}),scale=5,margin=4,width=(qr.modules.size+margin*2)*scale;
  const pixels=new Uint8ClampedArray(width*width).fill(255);
  for(let y=0;y<width;y++)for(let x=0;x<width;x++){const row=Math.floor(y/scale)-margin,col=Math.floor(x/scale)-margin;if(row>=0&&col>=0&&row<qr.modules.size&&col<qr.modules.size&&qr.modules.get(row,col))pixels[y*width+x]=0;}
  const decoded=new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,width)))).getText();
  assert.equal(decoded,payload);assert.equal(normalizeCouponCode(decoded),'ANV-ABCDEF123456');
  assert.equal(normalizeCouponCode('anv-abcdef123456'),'ANV-ABCDEF123456');
  for(const invalid of ['https://example.com/qr','ANV-123','ANVID:DEMO-FAKE',{},null])assert.throws(()=>normalizeCouponCode(invalid),{status:400});
});

const emulator=/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'');
const app=emulator?initializeApp({projectId:`demo-anvid-redeem-${Date.now()}`},'redemption-tests'):null;
const db=app?getFirestore(app):null;
after(async()=>{if(app){await db.terminate();await deleteApp(app);}});
const person=value=>createHash('sha256').update(String(value)).digest('hex');
test('Firestore: 12 canjes simultáneos entregan una sola confirmación', {skip:!emulator},async()=>{
  const now=new Date('2026-10-21T17:00:00Z');const {coupon}=await drawDailyCoupon(db,person('redeem-winner'),{now,random:()=>1});
  const inspection=await inspectCoupon(db,`ANVID:${coupon.code}`);assert.equal(inspection.redeemedAt,null);
  const attempts=await Promise.allSettled(Array.from({length:12},()=>redeemCoupon(db,coupon.code,now)));
  assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
  const rejected=attempts.filter(result=>result.status==='rejected');assert.equal(rejected.length,11);assert.ok(rejected.every(result=>result.reason.status===409));
  assert.equal((await inspectCoupon(db,coupon.code)).redeemedAt,now.toISOString());
  assert.equal((await db.doc('stats/redemptions').get()).data().count,1);
  await assert.rejects(()=>redeemCoupon(db,coupon.code,now),{status:409});
});
test('Firestore: cupones sin premio, inexistentes y duplicados no se canjean', {skip:!emulator},async()=>{
  const {coupon}=await drawDailyCoupon(db,person('redeem-loss'),{now:new Date('2026-10-21T18:00:00Z')});
  await assert.rejects(()=>redeemCoupon(db,coupon.code),{status:409});
  await assert.rejects(()=>inspectCoupon(db,'ANV-000000000000'),{status:404});
  await db.doc('coupons/duplicate-test').set({...((await db.collection('coupons').where('code','==',coupon.code).get()).docs[0].data())});
  await assert.rejects(()=>redeemCoupon(db,coupon.code),{status:409});
});

test('Firestore: un QR TEST se canjea una sola vez y deja intactos premio, cupones y estadísticas reales', {skip:!emulator},async()=>{
  const refs=['dailyPrizes/2026-10-21','dailyActivity/2026-10-21','dailyDraws/2026-10-21','stats/redemptions'].map(path=>db.doc(path));
  const before=await db.getAll(...refs),count=(await db.collection('coupons').get()).size;
  const coupon=await createTestCoupon(db,new Date('2026-10-21T20:00:00Z'));
  assert.equal(coupon.test,true);assert.match(coupon.code,/^TEST-[A-F0-9]{12}$/);
  const payload=`ANVID-TEST:${coupon.code}`;assert.equal(normalizeTestCode(payload),coupon.code);
  assert.throws(()=>normalizeCouponCode(payload),{status:400});
  assert.throws(()=>normalizeTestCode('ANVID:TEST-ABCDEF123456'),{status:400});
  assert.throws(()=>normalizeTestCode('ANVID-TEST:ANV-ABCDEF123456'),{status:400});
  assert.equal((await inspectCoupon(db,payload)).test,true);
  const results=await Promise.allSettled(Array.from({length:12},()=>redeemCoupon(db,payload)));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.ok(results.filter(result=>result.status==='rejected').every(result=>result.reason.status===409));
  assert.ok((await inspectCoupon(db,coupon.code)).redeemedAt);
  const after=await db.getAll(...refs);assert.deepEqual(after.map(row=>row.data()),before.map(row=>row.data()));
  assert.equal((await db.collection('coupons').get()).size,count);
});
test('Firestore: límite de intentos de acceso y resumen privado con datos reales', {skip:!emulator},async()=>{
  const req={headers:{'x-forwarded-for':'127.0.0.10'}},key=Buffer.from('rate-test-key'),now=Date.parse('2026-10-21T18:00:00Z');
  for(let i=0;i<8;i++)await limitAdminLogin(db,req,key,now);
  await assert.rejects(()=>limitAdminLogin(db,req,key,now),{status:429});
  await limitAdminLogin(db,req,key,now+15*60000);
  const summary=await adminDashboard(db,new Date(now));assert.equal(summary.summary.redeemed,1);assert.equal(summary.summary.prizeAvailable,false);assert.equal(summary.activity.length,7);assert.ok(summary.coupons.some(coupon=>coupon.redeemedAt));
  const page=await couponPage(db);assert.ok(Array.isArray(page.coupons));
});
test('API privada: bloquea anónimos y origen ajeno; permite sesión y la revoca al salir', {skip:!emulator},async()=>{
  const old=process.env.ANVID_ADMIN_PASSWORD;process.env.ANVID_ADMIN_PASSWORD=privateTestPassword;
  const host='localhost:5174';
  const testNetwork=`127.1.${process.pid%255}.${Math.floor(Date.now()/1000)%255}`;
  async function call(method,body,cookie='',origin=`http://${host}`,url='/api/admin?view=session'){const headers={};let json;const req={method,url,headers:{host,origin,'content-type':'application/json',cookie,'x-forwarded-for':testNetwork},body};const res={setHeader:(k,v)=>headers[k]=v,end:value=>json=JSON.parse(value)};await adminHandler(req,res);return {status:res.statusCode,headers,json};}
  try{
    assert.equal((await call('GET')).status,401);
    assert.equal((await call('GET',undefined,'',`http://${host}`,'/api/admin?view=reviews')).status,401);
    assert.equal((await call('GET',undefined,'',`http://${host}`,'/api/admin?view=live')).status,401);
    assert.equal((await call('POST',{action:'createTestCoupon'})).status,401);
    assert.equal((await call('POST',{action:'recordSale',requestId:randomUUID(),quantity:1,locationId:'utvm'})).status,401);
    assert.equal((await call('POST',{action:'voidSale',saleId:randomUUID()})).status,401);
    assert.equal((await call('POST',{action:'login',password:privateTestPassword},'','http://attacker.test')).status,403);
    assert.equal((await call('POST',{action:'login',password:'incorrecta'})).status,401);
    const login=await call('POST',{action:'login',password:privateTestPassword});assert.equal(login.status,200);
    const cookie=login.headers['Set-Cookie'].split(';')[0];const state=await call('GET',undefined,cookie);assert.equal(state.status,200);assert.equal(state.json.authenticated,true);assert.match(state.headers['Cache-Control'],/no-store/);
    const opinions=await call('GET',undefined,cookie,`http://${host}`,'/api/admin?view=reviews');assert.equal(opinions.status,200);assert.ok(Array.isArray(opinions.json.reviews));assert.ok(opinions.json.reviews.length<=20);assert.match(opinions.headers['Cache-Control'],/no-store/);assert.equal(typeof opinions.json.count,'number');
    assert.equal((await call('GET',undefined,cookie,`http://${host}`,'/api/admin?view=reviews&cursor=invalid')).status,400);
    assert.equal((await call('GET',undefined,cookie,`http://${host}`,'/api/admin?view=live&since=invalid')).status,400);
    const live=await call('GET',undefined,cookie,`http://${host}`,'/api/admin?view=live');assert.equal(live.status,200);assert.equal(live.json.requiresSnapshot,true);
    const qrTest=await call('POST',{action:'createTestCoupon'},cookie);assert.equal(qrTest.status,200);assert.equal(qrTest.json.coupon.test,true);
    const requestId=randomUUID();
    const sale=await call('POST',{action:'recordSale',requestId,quantity:1,locationId:'utvm'},cookie);assert.equal(sale.status,200);assert.equal(sale.json.sale.profitCents,2005);
    const repeated=await call('POST',{action:'recordSale',requestId,quantity:1,locationId:'utvm'},cookie);assert.equal(repeated.json.isNew,false);
    assert.equal((await call('POST',{action:'voidSale',saleId:requestId},cookie,'http://attacker.test')).status,403);
    assert.ok((await call('POST',{action:'voidSale',saleId:requestId},cookie)).json.sale.voidedAt);
    const logout=await call('POST',{action:'logout'},cookie);assert.equal(logout.status,200);assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
    assert.equal((await call('GET',undefined,cookie)).status,401);
    const secondLogin=await call('POST',{action:'login',password:privateTestPassword});assert.equal(secondLogin.status,200);const secondCookie=secondLogin.headers['Set-Cookie'].split(';')[0];
    const oldSession=adminSettings(firebaseConnection().cookieKey).key;process.env.ANVID_ADMIN_PASSWORD=privateTestPassword+'-rotated';assert.notDeepEqual(adminSettings(firebaseConnection().cookieKey).key,oldSession);assert.equal((await call('GET',undefined,secondCookie)).status,401);
  }finally{if(old===undefined)delete process.env.ANVID_ADMIN_PASSWORD;else process.env.ANVID_ADMIN_PASSWORD=old;}
});
