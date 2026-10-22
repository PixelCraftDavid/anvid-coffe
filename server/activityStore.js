import { FieldPath, Timestamp } from 'firebase-admin/firestore';

const initializations=new WeakMap();
const dayMs=86400000;
const dayAt=milliseconds=>new Date(milliseconds).toISOString().slice(0,10);

// Migrate an existing day's coupons once. New draws await this baseline and then
// increment the same document atomically with the new coupon.
export async function ensureActivityDay(db,day) {
  let days=initializations.get(db);
  if(!days){days=new Map();initializations.set(db,days);}
  if(!days.has(day)){
    const pending=db.runTransaction(async transaction=>{
      const ref=db.doc(`dailyActivity/${day}`);
      const saved=await transaction.get(ref);
      if(saved.data()?.version===1)return;
      const coupons=await transaction.get(db.collection('coupons').where('day','==',day));
      transaction.set(ref,{day,count:coupons.size,version:1,updatedAt:Timestamp.now()});
    });
    days.set(day,pending);
    pending.catch(()=>{if(days.get(day)===pending)days.delete(day);});
  }
  return days.get(day);
}

export async function activityYear(db,today) {
  const end=Date.parse(`${today}T12:00:00Z`),start=dayAt(end-364*dayMs);
  const [first,snapshot]=await Promise.all([
    db.collection('coupons').orderBy('createdAt','asc').limit(1).get(),
    db.collection('dailyActivity').orderBy(FieldPath.documentId()).startAt(start).endAt(today).get(),
  ]);
  const earliest=first.docs[0]?.data().day||today;
  const values=new Map(snapshot.docs.map(row=>[row.id,row.data().count]));
  const missing=[];
  for(let time=Math.max(Date.parse(`${earliest}T12:00:00Z`),Date.parse(`${start}T12:00:00Z`));time<=end;time+=dayMs){const day=dayAt(time);if(!values.has(day))missing.push(day);}
  // The previous release has only a short history. Limit migration work per
  // request if an imported database ever contains a much older history.
  const batch=missing.slice(-14);
  for(let offset=0;offset<batch.length;offset+=4){await Promise.all(batch.slice(offset,offset+4).map(day=>ensureActivityDay(db,day)));}
  if(batch.length){const saved=await db.getAll(...batch.map(day=>db.doc(`dailyActivity/${day}`)));saved.forEach(row=>values.set(row.id,row.data().count));}
  const days=Array.from({length:365},(_,i)=>{const day=dayAt(end-(364-i)*dayMs);return {day,count:values.get(day)??(day<earliest?0:null)};});
  return {start,end:today,days,total:days.reduce((sum,item)=>sum+(item.count||0),0),activeDays:days.filter(item=>item.count>0).length,incomplete:days.some(item=>item.count===null)};
}
