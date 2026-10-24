import {FieldValue,FieldPath,Timestamp} from 'firebase-admin/firestore';
import {ServiceError} from './firebase.js';

export const liveTopics=['sales','reviews','coupons','requests'];
export const eventCollection='dashboardEvents';
const idPattern=/^[A-Za-z0-9]{20}$/;
// Unique commit-stamped events avoid shared write locks across operations.
export function markDashboardChange(transaction,db,topic){
  if(!liveTopics.includes(topic))throw new Error('Unknown dashboard topic');
  transaction.create(db.collection(eventCollection).doc(),{topic,stamp:FieldValue.serverTimestamp()});
}
export function eventRevision(document,day){const stamp=document?.data()?.stamp;return {v:2,day,seconds:stamp?.seconds||0,nanos:stamp?.nanoseconds||0,id:document?.id||''};}
export async function dashboardRevision(db,day){
  const head=await db.collection(eventCollection).orderBy('stamp','desc').orderBy(FieldPath.documentId(),'desc').limit(1).get(),revision=eventRevision(head.docs[0],day);
  return {...revision,...Object.fromEntries(liveTopics.map(topic=>[topic,revision.id]))};
}
export function parseDashboardRevision(input){
  if(!input)return null;
  if(typeof input!=='string'||input.length>350)throw new ServiceError(400,'No pudimos comprobar los cambios del panel.');
  let data;try{data=JSON.parse(input);}catch{/* Validation below. */}
  if(data?.v!==2||!/^\d{4}-\d{2}-\d{2}$/.test(data.day||'')||!Number.isSafeInteger(data.seconds)||data.seconds<0||!Number.isInteger(data.nanos)||data.nanos<0||data.nanos>=1e9||!(data.id===''||idPattern.test(data.id))||liveTopics.some(topic=>topic==='requests'&&data[topic]===undefined?false:!(data[topic]===''||idPattern.test(data[topic]))))throw new ServiceError(400,'No pudimos comprobar los cambios del panel.');
  return data;
}
export async function eventsSince(db,since){let query=db.collection(eventCollection).orderBy('stamp','asc').orderBy(FieldPath.documentId(),'asc');if(since.id)query=query.startAfter(new Timestamp(since.seconds,since.nanos),since.id);return query.limit(51).get();}
