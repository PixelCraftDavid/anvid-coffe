import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

const cookieName='anvid_admin';
const sessionMs=8*3600000;
export function adminSettings(cookieKey) {
  const password=process.env.ANVID_ADMIN_PASSWORD;
  if(typeof password!=='string' || password.trim().length<16 || password.length>256) throw new ServiceError(503,'El acceso privado aún necesita configurarse en Vercel.');
  const key=createHmac('sha256',cookieKey).update('anvid-admin-session-v1\0').update(password).digest();
  return {password,key};
}
function digest(value){return createHash('sha256').update(value).digest();}
export function checkPassword(input,expected){return typeof input==='string' && input.length<=256 && timingSafeEqual(digest(input),digest(expected));}
const sign=(value,key)=>createHmac('sha256',key).update(value).digest('base64url');
function writeCookie(req,res,value,maxAge) {
  const secure=!!process.env.VERCEL || req.headers['x-forwarded-proto']==='https';
  res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`);
}
export function createAdminSession(req,res,key,now=Date.now()) {
  const expiresAt=now+sessionMs;
  const nonce=randomBytes(18).toString('base64url');
  const payload=Buffer.from(JSON.stringify({v:1,exp:expiresAt,n:nonce})).toString('base64url');
  writeCookie(req,res,`${payload}.${sign(payload,key)}`,sessionMs/1000);
  return {expiresAt:new Date(expiresAt).toISOString(),sessionId:digest(nonce).toString('hex')};
}
export function clearAdminSession(req,res){writeCookie(req,res,'',0);}
export function requireAdminSession(req,key,now=Date.now()) {
  const cookie=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(`${cookieName}=`));
  const token=cookie?.slice(cookieName.length+1)||'';
  if(token.length>512) throw new ServiceError(401,'Inicia sesión para continuar.');
  const [payload='',signature='',extra]=token.split('.');
  if(extra || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature) || !timingSafeEqual(Buffer.from(signature),Buffer.from(sign(payload,key)))) throw new ServiceError(401,'Inicia sesión para continuar.');
  let session;try{session=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{throw new ServiceError(401,'Inicia sesión para continuar.');}
  if(session.v!==1 || !Number.isSafeInteger(session.exp) || session.exp<=now || session.exp>now+sessionMs || !/^[A-Za-z0-9_-]{24}$/.test(session.n||'')) throw new ServiceError(401,'Tu sesión terminó. Vuelve a iniciar sesión.');
  return {expiresAt:new Date(session.exp).toISOString(),sessionId:digest(session.n).toString('hex')};
}

export async function saveAdminSession(db,session,now=Date.now()) {await db.doc(`adminSessions/${session.sessionId}`).set({createdAt:Timestamp.fromMillis(now),expiresAt:Timestamp.fromDate(new Date(session.expiresAt))});}
export async function verifyStoredSession(db,session,now=Date.now()) {const saved=await db.doc(`adminSessions/${session.sessionId}`).get();if(!saved.exists || saved.data().revokedAt || saved.data().expiresAt.toMillis()<=now)throw new ServiceError(401,'Tu sesión terminó. Vuelve a iniciar sesión.');}
export async function revokeAdminSession(db,session) {await db.doc(`adminSessions/${session.sessionId}`).set({revokedAt:Timestamp.now()},{merge:true});}

export async function limitAdminLogin(db,req,key,now=Date.now()) {
  const bucket=Math.floor(now/(15*60000));
  const ip=String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0,128);
  const identifier=createHmac('sha256',key).update(ip).digest('hex');
  const refs=[db.doc(`adminLoginAttempts/${bucket}_global`),db.doc(`adminLoginAttempts/${bucket}_${identifier}`)];
  await db.runTransaction(async transaction=>{
    const snapshots=await transaction.getAll(...refs);
    if((snapshots[0].data()?.attempts||0)>=40 || (snapshots[1].data()?.attempts||0)>=8) throw new ServiceError(429,'Demasiados intentos. Espera 15 minutos antes de volver a probar.');
    snapshots.forEach((snapshot,i)=>transaction.set(refs[i],{attempts:(snapshot.data()?.attempts||0)+1,window:bucket,expiresAt:Timestamp.fromMillis((bucket+1)*15*60000)}));
  });
}
