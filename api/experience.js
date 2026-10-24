import { firebaseConnection, ServiceError } from '../server/firebase.js';
import { getParticipant, requireSameOrigin } from '../server/session.js';
import { drawPurchaseCoupon,purchaseState, listReviews, readState, writeReview } from '../server/coffeeStore.js';

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
      return send(200, await readState(db, participant));
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
    if (body.action === 'play') return send(200, await drawPurchaseCoupon(db, participant,body.token));
    if (body.action === 'review') return send(200, await writeReview(db, participant, body));
    throw new ServiceError(400, 'Solicitud no reconocida.');
  } catch (error) {
    if (error instanceof ServiceError) return send(error.status, { error: error.message });
    // Never expose credentials, Firestore documents or SDK error payloads.
    console.error('Anvid data request failed', typeof error.code === 'number' ? error.code : 'unavailable');
    return send(503, { error: 'No pudimos conectar con el café. Inténtalo de nuevo en un momento.' });
  }
}
