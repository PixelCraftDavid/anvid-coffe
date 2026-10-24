import { firebaseConnection, ServiceError } from '../server/firebase.js';
import { requireSameOrigin } from '../server/session.js';
import { adminSettings, checkPassword, createAdminSession, clearAdminSession, requireAdminSession, limitAdminLogin, saveAdminSession, verifyStoredSession, revokeAdminSession } from '../server/adminAuth.js';
import { adminDashboard, couponPage, inspectCoupon, redeemCoupon, dashboardChanges } from '../server/redemption.js';
import { createTestCoupon } from '../server/testCoupons.js';
import { recordSale, voidSale } from '../server/salesStore.js';
import { listReviews } from '../server/coffeeStore.js';
import {salePasses} from '../server/playPasses.js';
import {waitingRequests,authorizeExistingSale,dismissPlayRequest,requestCode} from '../server/playRequests.js';

async function readBody(req) {
  let body=req.body;
  if(body===undefined){const parts=[];let size=0;for await(const part of req){size+=Buffer.byteLength(part);if(size>4096)throw new ServiceError(413,'La solicitud es demasiado grande.');parts.push(Buffer.from(part));}body=Buffer.concat(parts).toString();}
  if(typeof body==='string'){if(Buffer.byteLength(body)>4096)throw new ServiceError(413,'La solicitud es demasiado grande.');try{body=JSON.parse(body);}catch{throw new ServiceError(400,'No pudimos leer la solicitud.');}}
  if(!body || typeof body!=='object' || Array.isArray(body))throw new ServiceError(400,'No pudimos leer la solicitud.');
  if(Buffer.byteLength(JSON.stringify(body))>4096)throw new ServiceError(413,'La solicitud es demasiado grande.');
  return body;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  try{
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');throw new ServiceError(405,'Método no permitido.');}
    if(req.method==='POST')requireSameOrigin(req);
    const {db,cookieKey}=firebaseConnection();const {password,key}=adminSettings(cookieKey);
    let body;
    if(req.method==='POST'){
      body=await readBody(req);
      if(body.action==='logout'){try{await revokeAdminSession(db,requireAdminSession(req,key));}catch(error){if(error.status!==401)throw error;}clearAdminSession(req,res);return send(200,{authenticated:false});}
      if(body.action==='login'){
        await limitAdminLogin(db,req,key);
        if(!checkPassword(body.password,password))throw new ServiceError(401,'La contraseña no es correcta.');
        const session=createAdminSession(req,res,key);await saveAdminSession(db,session);
        return send(200,{authenticated:true,expiresAt:session.expiresAt,local:!!process.env.FIRESTORE_EMULATOR_HOST&&!process.env.VERCEL});
      }
    }
    const session=requireAdminSession(req,key);
    await verifyStoredSession(db,session);
    if(req.method==='GET'){
      const url=new URL(req.url,`http://${req.headers.host}`);
      if(url.searchParams.get('view')==='session')return send(200,{authenticated:true,expiresAt:session.expiresAt,local:!!process.env.FIRESTORE_EMULATOR_HOST&&!process.env.VERCEL});
      if(url.searchParams.get('view')==='coupons')return send(200,await couponPage(db,url.searchParams.get('cursor')));
      if(url.searchParams.get('view')==='reviews')return send(200,await listReviews(db,null,url.searchParams.get('cursor')));
      if(url.searchParams.get('view')==='passes')return send(200,await salePasses(db,url.searchParams.get('saleId')));
      if(url.searchParams.get('view')==='requests')return send(200,await waitingRequests(db,url.searchParams.get('code')));
      if(url.searchParams.get('view')==='live')return send(200,await dashboardChanges(db,url.searchParams.get('since')));
      return send(200,await adminDashboard(db));
    }
    if(body.action==='inspect')return send(200,{coupon:await inspectCoupon(db,body.code)});
    if(body.action==='redeem')return send(200,{coupon:await redeemCoupon(db,body.code)});
    if(body.action==='createTestCoupon')return send(200,{coupon:await createTestCoupon(db)});
    if(body.action==='recordSale')return send(200,await recordSale(db,body));
    if(body.action==='authorizePlay')return send(200,await recordSale(db,{...body,requestCode:requestCode(body.requestCode),quantity:1}));
    if(body.action==='authorizeExistingSale')return send(200,await authorizeExistingSale(db,body.requestCode,body.saleId));
    if(body.action==='dismissPlayRequest')return send(200,await dismissPlayRequest(db,body.requestCode));
    if(body.action==='voidSale')return send(200,await voidSale(db,body.saleId));
    throw new ServiceError(400,'Solicitud no reconocida.');
  }catch(error){
    if(error instanceof ServiceError){if(error.status===429)res.setHeader('Retry-After','900');return send(error.status,{error:error.message});}
    console.error('Anvid private request failed',typeof error.code==='number'?error.code:'unavailable');
    return send(503,{error:'No pudimos conectar con el panel. Inténtalo de nuevo en un momento.'});
  }
}
