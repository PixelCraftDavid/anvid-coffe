import {randomBytes,createHash} from 'node:crypto';
import {ServiceError} from './firebase.js';

export function passId(token){
  if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))throw new ServiceError(403,'Necesitas el pase de tu compra para jugar. Pídeselo al equipo de Anvid.');
  return createHash('sha256').update(token).digest('hex');
}
export function createSalePasses(quantity){return Array.from({length:quantity},()=>randomBytes(24).toString('hex'));}
export function saveSalePasses(transaction,db,saleId,tokens,createdAt,binding={}){
  tokens.forEach((token,index)=>transaction.create(db.doc(`playPasses/${passId(token)}`),{saleId,ordinal:index+1,createdAt,usedAt:null,participant:null,couponId:null,...(index===0?binding:{})}));
}
export async function salePasses(db,saleId){
  if(!/^[0-9a-f-]{36}$/.test(saleId||''))throw new ServiceError(400,'Selecciona una venta válida.');
  const sale=await db.doc(`sales/${saleId}`).get();if(!sale.exists)throw new ServiceError(404,'No encontramos esta venta.');
  const tokens=sale.data().passTokens||[];
  const rows=tokens.length?await db.getAll(...tokens.map(token=>db.doc(`playPasses/${passId(token)}`))):[];
  return {saleId,passes:rows.map((row,index)=>({token:tokens[index],ordinal:row.data().ordinal,status:sale.data().voidedAt?'voided':row.data().usedAt?'used':'available',usedAt:row.data().usedAt?.toDate().toISOString()||null}))};
}
export async function inspectPlayPass(db,token,participant){
  const ref=db.doc(`playPasses/${passId(token)}`),saved=await ref.get(),data=saved.data();
  if(!data)throw new ServiceError(404,'No encontramos ese pase. Comprueba el QR de tu compra.');
  if(data.assignedParticipant&&data.assignedParticipant!==participant)throw new ServiceError(403,'Este juego está autorizado para otro navegador. Muestra tu propio identificador al equipo.');
  const sale=await db.doc(`sales/${data.saleId}`).get();
  if(data.usedAt&&data.participant!==participant)throw new ServiceError(409,'Este pase ya se usó en otro navegador. Cada pase permite un solo intento.');
  if(!data.usedAt&&(!sale.exists||sale.data().voidedAt))throw new ServiceError(409,'La compra de este pase fue anulada. Consulta al equipo de Anvid.');
  return {ref,saleRef:sale.ref,data};
}
