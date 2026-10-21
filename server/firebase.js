import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

export class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let connection;
export function firebaseConnection() {
  if (connection) return connection;
  if (process.env.FIRESTORE_EMULATOR_HOST && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new ServiceError(503, 'Emulador local no válido.');
    const app = getApps().find(app => app.name === 'anvid-local') || initializeApp({projectId:'demo-anvid-local'},'anvid-local');
    connection = { db:getFirestore(app),cookieKey:createHash('sha256').update('local-emulator-only').digest() };
    return connection;
  }
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null'); } catch { /* Fail closed below. */ }
  if (!account?.project_id || !account.client_email || !account.private_key) {
    throw new ServiceError(503, 'Estamos preparando las tarjetas. Vuelve en un momento.');
  }
  if (account.project_id !== 'anvid-coffe') throw new ServiceError(503, 'La conexión del café necesita configurarse.');
  const app = getApps().find(app => app.name === 'anvid') || initializeApp({ credential: cert(account), projectId: account.project_id }, 'anvid');
  const db = getFirestore(app);
  // Separate signing material without requiring a second secret during setup.
  const cookieKey = createHash('sha256').update('anvid-session-v1\0').update(account.private_key).digest();
  connection = { db, cookieKey };
  return connection;
}
