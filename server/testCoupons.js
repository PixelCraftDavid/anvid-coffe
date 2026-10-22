import {randomBytes} from 'node:crypto';
import {Timestamp} from 'firebase-admin/firestore';
import {ServiceError} from './firebase.js';
import {publicCoupon} from './coffeeStore.js';

export function normalizeTestCode(input) {
  if(typeof input!=='string'||input.length>180)throw new ServiceError(400,'Ese código de prueba no es válido.');
  const code=input.trim().toUpperCase().replace(/\s/g,'').replace(/^ANVID-TEST:/,'');
  if(!/^TEST-[A-F0-9]{12}$/.test(code))throw new ServiceError(400,'Ese código de prueba no es válido.');
  return code;
}
export function isTestCode(input){return typeof input==='string'&&/^(ANVID-TEST:|TEST-)/i.test(input.trim());}
function publicTest(data){return {...publicCoupon(data),test:true};}
export async function createTestCoupon(db,now=new Date()) {
  const id=randomBytes(6).toString('hex').toUpperCase();
  const stamp=Timestamp.fromDate(now);
  const coupon={code:`TEST-${id}`,won:true,day:null,createdAt:stamp,wonAt:stamp,redeemedAt:null};
  await db.doc(`testCoupons/${id}`).create(coupon);
  return publicTest(coupon);
}
export async function inspectTestCoupon(db,input) {
  const code=normalizeTestCode(input);
  const saved=await db.doc(`testCoupons/${code.slice(5)}`).get();
  if(!saved.exists)throw new ServiceError(404,'No encontramos ese cupón de prueba. Crea uno desde el panel.');
  return publicTest(saved.data());
}
export async function redeemTestCoupon(db,input,now=new Date()) {
  const code=normalizeTestCode(input),ref=db.doc(`testCoupons/${code.slice(5)}`);
  const coupon=await db.runTransaction(async transaction=>{
    const saved=await transaction.get(ref);
    if(!saved.exists)throw new ServiceError(404,'No encontramos ese cupón de prueba.');
    const data=saved.data();
    if(data.redeemedAt)throw new ServiceError(409,'Esta prueba ya fue canjeada. Crea otro QR para repetirla.');
    const redeemedAt=Timestamp.fromDate(now);
    transaction.update(ref,{redeemedAt});
    return {...data,redeemedAt};
  });
  // Test coupons never read or write dailyPrizes, coupons, dailyActivity or stats.
  return publicTest(coupon);
}
