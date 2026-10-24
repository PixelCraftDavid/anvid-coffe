import {randomBytes,createHmac} from 'node:crypto';
import {Timestamp} from 'firebase-admin/firestore';
import {ServiceError} from './firebase.js';
import {passId,createSalePasses,saveSalePasses} from './playPasses.js';
import {markDashboardChange} from './dashboardLive.js';

export const requestLifetime=15*60*1000;
export function requestCode(value){
  if(typeof value!=='string'||value.length>20)throw new ServiceError(400,'Escribe el identificador que muestra el cliente.');
  const code=value.toUpperCase().replace(/[\s-]/g,'');
  if(!/^[A-F0-9]{6}$/.test(code))throw new ServiceError(400,'El identificador tiene seis letras y números.');
  return code;
}
function publicRequest(data,code,now){return {code,status:data.status==='pending'&&data.expiresAt.toMillis()<=now.getTime()?'expired':data.status,createdAt:data.createdAt.toDate().toISOString(),expiresAt:data.expiresAt.toDate().toISOString()};}
export async function ownPlayRequest(db,participant,now=new Date()){
  const owner=await db.doc(`playRequestOwners/${participant}`).get(),code=owner.data()?.code;
  if(!code)return {request:null};
  const saved=await db.doc(`playRequests/${code}`).get(),data=saved.data();
  if(!data||data.participant!==participant)return {request:null};
  return {request:publicRequest(data,code,now),...(['approved','used'].includes(data.status)?{passToken:data.passToken}:{})};
}
export async function createPlayRequest(db,participant,{now=new Date(),key,network='unknown'}={}){
  const ownerRef=db.doc(`playRequestOwners/${participant}`),stamp=Timestamp.fromDate(now),window=Math.floor(now.getTime()/requestLifetime);
  const fingerprint=createHmac('sha256',key).update(String(network).slice(0,200)).digest('hex');
  const limitRef=db.doc(`playRequestLimits/${window}_${fingerprint}`),globalRef=db.doc(`playRequestLimits/${window}_global`);
  return db.runTransaction(async transaction=>{
    const owner=await transaction.get(ownerRef),oldCode=owner.data()?.code;
    const prior=oldCode?await transaction.get(db.doc(`playRequests/${oldCode}`)):null,old=prior?.data();
    if(old?.status==='pending'&&old.expiresAt.toMillis()>now.getTime())return {request:publicRequest(old,oldCode,now)};
    let priorStatus;
    if(old?.status==='approved'){
      const pass=await transaction.get(db.doc(`playPasses/${passId(old.passToken)}`)),data=pass.data();
      const sale=data?await transaction.get(db.doc(`sales/${data.saleId}`)):null;
      if(data&&!data.usedAt&&sale?.exists&&!sale.data().voidedAt)return {request:publicRequest(old,oldCode,now)};
      priorStatus=data?.usedAt?'used':'cancelled';
    }
    const [limit,global]=await transaction.getAll(limitRef,globalRef);
    if((limit.data()?.count||0)>=60||(global.data()?.count||0)>=120)throw new ServiceError(429,'Hay muchas solicitudes en este momento. Consulta al equipo de Anvid.');
    let ref,saved;
    for(let i=0;i<5;i++){ref=db.doc(`playRequests/${randomBytes(3).toString('hex').toUpperCase()}`);saved=await transaction.get(ref);if(!saved.exists)break;}
    if(saved.exists)throw new ServiceError(503,'No pudimos preparar tu identificador. Vuelve a intentar.');
    const data={participant,status:'pending',createdAt:stamp,expiresAt:Timestamp.fromMillis(now.getTime()+requestLifetime)};
    if(old?.status==='pending'){transaction.update(prior.ref,{status:'expired'});transaction.delete(db.doc(`playWaiting/${oldCode}`));}
    if(priorStatus)transaction.update(prior.ref,{status:priorStatus});
    transaction.create(ref,data);transaction.create(db.doc(`playWaiting/${ref.id}`),{createdAt:stamp,expiresAt:data.expiresAt});
    transaction.set(ownerRef,{code:ref.id});transaction.set(limitRef,{count:(limit.data()?.count||0)+1});transaction.set(globalRef,{count:(global.data()?.count||0)+1});
    markDashboardChange(transaction,db,'requests');
    return {request:publicRequest(data,ref.id,now)};
  },{maxAttempts:10});
}
export async function waitingRequests(db,code,now=new Date()){
  if(code){const normalized=requestCode(code),saved=await db.doc(`playRequests/${normalized}`).get();return {items:saved.exists?[publicRequest(saved.data(),normalized,now)]:[],hasMore:false};}
  const rows=await db.collection('playWaiting').where('expiresAt','>',Timestamp.fromDate(now)).orderBy('expiresAt','desc').limit(31).get();
  return {items:rows.docs.slice(0,30).map(row=>({code:row.id,status:'pending',createdAt:row.data().createdAt.toDate().toISOString(),expiresAt:row.data().expiresAt.toDate().toISOString()})),hasMore:rows.size>30};
}
export async function pendingInTransaction(transaction,db,value,now){
  const code=requestCode(value),saved=await transaction.get(db.doc(`playRequests/${code}`)),data=saved.data();
  if(!data)throw new ServiceError(404,'No encontramos ese identificador. Comprueba la pantalla del cliente.');
  if(data.status!=='pending'||data.expiresAt.toMillis()<=now.getTime())throw new ServiceError(409,'Este identificador ya fue atendido o caducó. Pide al cliente que revise su pantalla.');
  const owner=await transaction.get(db.doc(`playRequestOwners/${data.participant}`));
  if(owner.data()?.code!==code)throw new ServiceError(409,'El cliente ya tiene otro identificador. Revisa el que muestra ahora.');
  return saved;
}
export function approveRequest(transaction,db,request,token,saleId,now){
  transaction.update(request.ref,{status:'approved',passToken:token,saleId,approvedAt:Timestamp.fromDate(now)});
  transaction.delete(db.doc(`playWaiting/${request.id}`));markDashboardChange(transaction,db,'requests');
}
export async function authorizeExistingSale(db,value,saleId,now=new Date()){
  if(!/^[a-f0-9-]{36}$/.test(saleId||''))throw new ServiceError(400,'Selecciona la venta que ya registraste.');
  return db.runTransaction(async transaction=>{
    const code=requestCode(value),requestRef=db.doc(`playRequests/${code}`),prior=await transaction.get(requestRef);
    if(prior.data()?.saleId===saleId&&['approved','used'].includes(prior.data().status))return {authorized:true,code,saleId,isNew:false};
    const request=await pendingInTransaction(transaction,db,code,now),saleRef=db.doc(`sales/${saleId}`),sale=await transaction.get(saleRef),data=sale.data();
    if(!data||data.voidedAt)throw new ServiceError(409,'Esta venta no está disponible para autorizar un juego.');
    const legacy=!data.passTokens?.length,tokens=legacy?createSalePasses(data.quantity):data.passTokens;
    const passes=legacy?[]:await transaction.getAll(...tokens.map(token=>db.doc(`playPasses/${passId(token)}`)));
    const index=legacy?0:passes.findIndex(row=>row.exists&&!row.data().usedAt&&!row.data().assignedParticipant);
    if(index<0)throw new ServiceError(409,'Todos los intentos de esta venta ya están utilizados o asignados.');
    const binding={assignedParticipant:request.data().participant,requestCode:code};
    if(legacy){saveSalePasses(transaction,db,saleId,tokens,data.createdAt,binding);transaction.update(saleRef,{passTokens:tokens});}
    else transaction.update(passes[index].ref,binding);
    approveRequest(transaction,db,request,tokens[index],saleId,now);
    return {authorized:true,code,saleId,isNew:true};
  },{maxAttempts:10});
}
export async function dismissPlayRequest(db,value,now=new Date()){
  return db.runTransaction(async transaction=>{const request=await pendingInTransaction(transaction,db,value,now);transaction.update(request.ref,{status:'cancelled',cancelledAt:Timestamp.fromDate(now)});transaction.delete(db.doc(`playWaiting/${request.id}`));markDashboardChange(transaction,db,'requests');return {dismissed:true};});
}
