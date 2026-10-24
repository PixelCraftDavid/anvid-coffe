import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { ServiceError } from './firebase.js';
import { campaignDay, publicCoupon } from './coffeeStore.js';
import { activityYear } from './activityStore.js';
import { isTestCode,inspectTestCoupon,redeemTestCoupon } from './testCoupons.js';
import { salesOverview } from './salesStore.js';
import {dashboardRevision,parseDashboardRevision,markDashboardChange,eventsSince,eventRevision} from './dashboardLive.js';
import {waitingRequests} from './playRequests.js';

export function normalizeCouponCode(input) {
  if(typeof input!=='string' || input.length>180) throw new ServiceError(400,'Escribe el código del cupón o escanea su QR.');
  const code=input.trim().toUpperCase().replace(/^ANVID:/,'').replace(/\s/g,'');
  if(!/^ANV-[A-F0-9]{12}$/.test(code)) throw new ServiceError(400,'Ese QR o código no es un cupón de Anvid.');
  return code;
}
async function findCoupon(db,input) {
  const code=normalizeCouponCode(input);
  const result=await db.collection('coupons').where('code','==',code).limit(2).get();
  if(result.size===0) throw new ServiceError(404,'No encontramos ese cupón. Comprueba el código.');
  if(result.size!==1) throw new ServiceError(409,'Ese código necesita una revisión manual antes de canjearse.');
  return result.docs[0];
}
export async function inspectCoupon(db,input) {
  if(isTestCode(input))return inspectTestCoupon(db,input);
  const document=await findCoupon(db,input);
  return publicCoupon(document.data());
}
export async function redeemCoupon(db,input,now=new Date()) {
  if(isTestCode(input))return redeemTestCoupon(db,input,now);
  const document=await findCoupon(db,input);
  const statsRef=db.doc('stats/redemptions');
  const coupon=await db.runTransaction(async transaction=>{
    const [current,stats]=await transaction.getAll(document.ref,statsRef);
    const data=current.data();
    if(!data?.won) throw new ServiceError(409,'Este cupón no tiene premio y no puede canjearse.');
    if(data.redeemedAt) throw new ServiceError(409,'Este cupón ya fue canjeado. No entregues un segundo café.');
    const redeemedAt=Timestamp.fromDate(now);
    transaction.update(document.ref,{redeemedAt,redeemedBy:'anvid-admin'});
    transaction.set(statsRef,{count:(stats.data()?.count||0)+1,lastRedeemedAt:redeemedAt});
    markDashboardChange(transaction,db,'coupons',now);
    return {...data,redeemedAt};
  });
  return publicCoupon(coupon);
}
function encodeCursor(document){return Buffer.from(JSON.stringify({time:document.data().createdAt.toMillis(),id:document.id})).toString('base64url');}
export async function couponPage(db,cursor) {
  let query=db.collection('coupons').orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
  if(cursor){
    let value;try{value=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{/* Validated below. */}
    if(!Number.isSafeInteger(value?.time) || !/^\d{4}-\d{2}-\d{2}_[a-f0-9]{64}$/.test(value?.id||'')) throw new ServiceError(400,'No pudimos abrir esa página de cupones.');
    query=query.startAfter(Timestamp.fromMillis(value.time),value.id);
  }
  const snapshot=await query.limit(21).get();
  const rows=snapshot.docs.slice(0,20);
  return {coupons:rows.map(row=>publicCoupon(row.data())),nextCursor:snapshot.size>20?encodeCursor(rows.at(-1)):null};
}
export async function adminDashboard(db,now=new Date()) {
  // Read the revision first. A concurrent later commit remains visible to the
  // next cheap check even if these data queries already include that commit.
  const revision=await dashboardRevision(db,campaignDay(now));
  const days=Array.from({length:7},(_,i)=>campaignDay(new Date(now.getTime()-(6-i)*86400000)));
  const [year,prize,stats,redemptions,page,reviews,sales,waiting]=await Promise.all([
    activityYear(db,campaignDay(now)),
    db.doc(`dailyPrizes/${campaignDay(now)}`).get(),db.doc('stats/reviews').get(),db.doc('stats/redemptions').get(),couponPage(db),
    db.collection('reviews').orderBy('updatedAt','desc').limit(4).get(),
    salesOverview(db,now),waitingRequests(db,null,now),
  ]);
  const reviewStats=stats.data()||{count:0,sum:0};
  const counts=year.days.filter(item=>days.includes(item.day));
  return {revision,day:campaignDay(now),updatedAt:now.toISOString(),activity:counts,activityYear:year,sales,waiting,summary:{today:counts.at(-1).count||0,prizeAvailable:!prize.exists,redeemed:redemptions.data()?.count||0,reviewCount:reviewStats.count,average:reviewStats.count?reviewStats.sum/reviewStats.count:0},...page,reviews:reviews.docs.map(row=>({rating:row.data().rating,comment:row.data().comment,createdAt:row.data().createdAt.toDate().toISOString()}))};
}

export async function dashboardChanges(db,input,now=new Date()){
  const since=parseDashboardRevision(input),day=campaignDay(now);
  if(!since||since.day!==day)return {requiresSnapshot:true};
  const events=await eventsSince(db,since);
  if(events.size>50)return {requiresSnapshot:true};
  if(events.empty)return {revision:since,unchanged:true};
  const revision={...since,...eventRevision(events.docs.at(-1),day)},changed=[];
  for(const row of events.docs){const topic=row.data().topic;if(!['sales','reviews','coupons','requests'].includes(topic))continue;if(!changed.includes(topic))changed.push(topic);revision[topic]=row.id;}
  const patch={revision,updatedAt:now.toISOString(),summary:{}};
  await Promise.all(changed.map(async topic=>{
    if(topic==='sales')patch.sales=await salesOverview(db,now);
    if(topic==='requests')patch.waiting=await waitingRequests(db,null,now);
    if(topic==='reviews'){
      const stats=(await db.doc('stats/reviews').get()).data()||{count:0,sum:0};
      patch.summary.reviewCount=stats.count;patch.summary.average=stats.count?stats.sum/stats.count:0;
    }
    if(topic==='coupons'){
      const [activity,prize,stats,page]=await Promise.all([db.doc(`dailyActivity/${day}`).get(),db.doc(`dailyPrizes/${day}`).get(),db.doc('stats/redemptions').get(),couponPage(db)]);
      patch.summary.today=activity.data()?.count||0;patch.summary.prizeAvailable=!prize.exists;patch.summary.redeemed=stats.data()?.count||0;
      patch.activityDay={day,count:patch.summary.today};Object.assign(patch,page);
    }
  }));
  return {revision,changed,patch};
}
