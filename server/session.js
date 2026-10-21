import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ServiceError } from './firebase.js';

const cookieName = 'anvid_session';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function signature(value, key) { return createHmac('sha256', key).update(value).digest('base64url'); }
export function getParticipant(req, res, key) {
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  const [candidate, supplied = ''] = (cookie?.slice(cookieName.length + 1) || '').split('.');
  const expected = signature(candidate || '', key);
  const valid = uuid.test(candidate || '') && /^[A-Za-z0-9_-]{43}$/.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  const id = valid ? candidate : randomUUID();
  if (!valid) {
    const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('Set-Cookie', `${cookieName}=${id}.${signature(id, key)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure ? '; Secure' : ''}`);
  }
  return createHmac('sha256', key).update(`participant:${id}`).digest('hex');
}

export function requireSameOrigin(req) {
  let origin;
  try { origin = new URL(req.headers.origin); } catch { throw new ServiceError(403, 'Abre la página del café para continuar.'); }
  if (origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) throw new ServiceError(403, 'Abre la página del café para continuar.');
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new ServiceError(415, 'La solicitud debe enviarse como JSON.');
}
