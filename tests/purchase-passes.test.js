import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {recordSale,voidSale} from '../server/salesStore.js';
import {passId,salePasses} from '../server/playPasses.js';
import {drawPurchaseCoupon,purchaseState,readState} from '../server/coffeeStore.js';
import {tokenFromText} from '../src/playPassToken.js';
import {cupProjection,createCupMotion,voxelCoffee} from '../src/qrCupScene.js';
import experienceHandler from '../api/experience.js';
import QRCode from 'qrcode';
import zxing from '@zxing/library';
import {qrColors,qrInk} from '../src/qrPalette.js';

const emulator=/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'');
const app=emulator?initializeApp({projectId:`demo-anvid-passes-${Date.now()}`},'purchase-pass-tests'):null,db=app?getFirestore(app):null;
after(async()=>{if(app){await db.terminate();await deleteApp(app);}});
const person=value=>createHash('sha256').update(value).digest('hex'),sale=quantity=>({requestId:randomUUID(),quantity,locationId:'utvm'});

test('pases: tokens de compra y enlaces del mismo origen, sin aceptar URL ajena',()=>{
  const token='ab'.repeat(24),origin='https://anvid-coffe.vercel.app';
  assert.match(passId(token),/^[a-f0-9]{64}$/);assert.equal(tokenFromText(token,origin),token);assert.equal(tokenFromText(`${origin}/#p=${token}`,origin),token);
  for(const value of [null,'',token+'x','https://evil.example/#p='+token,`${origin}/panel#p=${token}`,`javascript:alert(1)`]){assert.equal(tokenFromText(value,origin),null);assert.throws(()=>passId(value),{status:403});}
});
test('taza QR: proyección acotada y transición interrumpible sin bucle en reposo',()=>{
  const cells=voxelCoffee({size:29,get:()=>true});assert.ok(cells.length<250);
  for(const width of [220,320,360])for(const p of [0,.5,1])for(const [x,y,z] of [[-.5,0,-.5],[.5,0,.5],...cells.flatMap(c=>[[c.x,-c.top*p,c.z],[c.x+c.size,-c.bottom*p,c.z+c.size]])]){const point=cupProjection(x,y,z,p,width,width);assert.ok(point.every(n=>n>=0&&n<=width),JSON.stringify({point,p,width}));}
  const frames=new Map();let serial=0,now=0,draws=[];const motion=createCupMotion({draw:p=>draws.push(p),requestFrame:fn=>{frames.set(++serial,fn);return serial;},cancelFrame:id=>frames.delete(id),clock:()=>now});
  const run=time=>{now=time;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
  motion.to(1);run(100);assert.equal(frames.size,1);const partial=motion.value;assert.ok(partial>0&&partial<1);motion.to(0);run(380);assert.equal(motion.value,0);assert.equal(frames.size,0);motion.to(1);motion.pause();assert.equal(frames.size,0);motion.redraw();assert.equal(draws.at(-1),1);motion.dispose();
});
test('QR en color: tonos de la escena con contraste y lectura de premio, TEST y pase de compra',()=>{
  const {QRCodeReader,BinaryBitmap,HybridBinarizer,RGBLuminanceSource}=zxing;
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const lum=hex=>rgb(hex).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const gray=hex=>{const [r,g,b]=rgb(hex);return Math.round((r+g*2+b)/4);};
  for(const payload of ['ANVID:ANV-ABCDEF123456','ANVID-TEST:TEST-ABCDEF123456',`https://anvid-coffe.vercel.app/#p=${'ab'.repeat(24)}`]){
    const {modules}=QRCode.create(payload,{errorCorrectionLevel:'M'}),scale=7,width=(modules.size+8)*scale,pixels=new Uint8ClampedArray(width*width).fill(gray(qrColors.paper));
    for(let r=0;r<modules.size;r++)for(let c=0;c<modules.size;c++)if(modules.get(r,c)){const color=qrInk(r,c,modules.size);assert.ok((lum(qrColors.paper)+.05)/(lum(color)+.05)>=4.5);for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)pixels[((r+4)*scale+y)*width+(c+4)*scale+x]=gray(color);}
    assert.equal(new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,width)))).getText(),payload);
  }
});
test('Firestore: compra, reintentos, apertura sin consumo y disputa de un solo pase',{skip:!emulator},async()=>{
  const now=new Date('2027-05-01T18:00:00Z'),input=sale(2),results=await Promise.all(Array.from({length:8},()=>recordSale(db,input,now)));
  assert.ok(results.every(row=>row.passes.length===2));assert.ok(results.every(row=>row.passes[0].token===results[0].passes[0].token));
  const token=results[0].passes[0].token,a=person('buyer-a'),b=person('buyer-b');
  assert.equal((await purchaseState(db,a,token)).purchase.status,'available');assert.equal((await purchaseState(db,b,token)).purchase.status,'available');assert.equal((await db.collection('coupons').get()).size,0);
  const attempts=await Promise.allSettled([drawPurchaseCoupon(db,a,token,{now,random:()=>1}),drawPurchaseCoupon(db,b,token,{now,random:()=>1})]);
  assert.equal(attempts.filter(row=>row.status==='fulfilled').length,1);assert.equal(attempts.find(row=>row.status==='rejected').reason.status,409);
  const winner=attempts[0].status==='fulfilled'?a:b,other=winner===a?b:a,original=attempts.find(row=>row.status==='fulfilled').value;
  assert.equal(original.coupon.won,true);assert.equal((await drawPurchaseCoupon(db,winner,token,{now})).isNew,false);await assert.rejects(()=>purchaseState(db,other,token),{status:409});
  assert.equal((await readState(db,winner,now)).coupon.code,original.coupon.code);assert.equal((await db.doc('dailyActivity/2027-05-01').get()).data().count,1);
  await voidSale(db,input.requestId,now);await assert.rejects(()=>drawPurchaseCoupon(db,a,results[0].passes[1].token,{now}),{status:409});
  const restored=await drawPurchaseCoupon(db,winner,token,{now:new Date('2027-05-02T18:00:00Z')});assert.equal(restored.coupon.code,original.coupon.code);assert.equal(restored.isNew,false);
  assert.equal((await salePasses(db,input.requestId)).passes[1].status,'voided');
});
test('Firestore: dos compras en un navegador permiten dos intentos, sin filtrar el pase',{skip:!emulator},async()=>{
  const now=new Date('2027-05-03T18:00:00Z'),purchase=await recordSale(db,sale(2),now),buyer=person('repeat-buyer');
  const first=await drawPurchaseCoupon(db,buyer,purchase.passes[0].token,{now,random:()=>2}),second=await drawPurchaseCoupon(db,buyer,purchase.passes[1].token,{now});
  assert.equal(first.coupon.won,false);assert.equal(second.coupon.won,true);assert.notEqual(first.coupon.code,second.coupon.code);
  assert.equal((await readState(db,buyer,now)).coupon.code,second.coupon.code);assert.ok(!JSON.stringify(second).includes(purchase.passes[1].token));
  await assert.rejects(()=>drawPurchaseCoupon(db,buyer,'00'.repeat(24),{now}),{status:404});
});
test('API pública: jugar sin un pase válido devuelve 403 y no crea un sorteo',{skip:!emulator},async()=>{
  const call=async token=>{let body;const res={setHeader(){},end:value=>{body=JSON.parse(value);}};await experienceHandler({method:'POST',url:'/api/experience',headers:{host:'localhost:5174',origin:'http://localhost:5174','content-type':'application/json'},body:{action:'play',token}},res);return {status:res.statusCode,body};};
  assert.equal((await call(undefined)).status,403);assert.equal((await call('ANVID:ANV-123')).status,403);
});
