import { firebaseConnection, ServiceError } from '../server/firebase.js';
import { getParticipant, requireSameOrigin } from '../server/session.js';
import { drawPurchaseCoupon,purchaseState, listReviews, readState, writeReview } from '../server/coffeeStore.js';
import {ownPlayRequest,createPlayRequest} from '../server/playRequests.js';

async function authorizationState(db,participant){
  const {request,passToken}=await ownPlayRequest(db,participant),state={request,purchase:null,coupon:null};
  if(passToken){try{return {...state,...await purchaseState(db,participant,passToken)};}catch(error){if(error instanceof ServiceError&&[403,404,409].includes(error.status))return {...state,request:{...request,status:'cancelled',message:error.message}};throw error;}}
  return state;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  try {
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); throw new ServiceError(405, 'Método no permitido.'); }
    if (req.method === 'POST') requireSameOrigin(req);
    const { db, cookieKey } = firebaseConnection();
    const participant = getParticipant(req, res, cookieKey);
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.searchParams.get('view') === 'reviews') return send(200, await listReviews(db, participant, url.searchParams.get('cursor')));
      if(url.searchParams.get('view')==='authorization')return send(200,await authorizationState(db,participant));
      const [state,access]=await Promise.all([readState(db,participant),authorizationState(db,participant)]);
      return send(200,{...state,accessMode:'staff',...(access.request?access:{request:null})});
    }
    let body = req.body;
    if (body === undefined) {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 8192) throw new ServiceError(413, 'La solicitud es demasiado grande.'); chunks.push(Buffer.from(chunk)); }
      body = Buffer.concat(chunks).toString();
    }
    if (typeof body === 'string') { if (Buffer.byteLength(body) > 8192) throw new ServiceError(413, 'La solicitud es demasiado grande.'); try { body = JSON.parse(body); } catch { throw new ServiceError(400, 'No pudimos leer la solicitud.'); } }
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new ServiceError(400, 'No pudimos leer la solicitud.');
    if(body.action==='passState')return send(200,await purchaseState(db,participant,body.token));
    if(body.action==='requestPlay'){await createPlayRequest(db,participant,{key:cookieKey,network:req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown'});return send(200,await authorizationState(db,participant));}
    if (body.action === 'play') {const token=body.token||(await ownPlayRequest(db,participant)).passToken;if(!token)throw new ServiceError(403,'Muestra tu identificador al equipo para autorizar el juego de tu compra.');return send(200, await drawPurchaseCoupon(db, participant,token));}
    if (body.action === 'review') return send(200, await writeReview(db, participant, body));
    throw new ServiceError(400, 'Solicitud no reconocida.');
  } catch (error) {
    if (error instanceof ServiceError) {if(error.status===429)res.setHeader('Retry-After','900');return send(error.status, { error: error.message });}
    // Never expose credentials, Firestore documents or SDK error payloads.
    console.error('Anvid data request failed', typeof error.code === 'number' ? error.code : 'unavailable');
    return send(503, { error: 'No pudimos conectar con el café. Inténtalo de nuevo en un momento.' });
  }
}
