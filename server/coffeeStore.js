import { randomBytes, randomInt } from 'node:crypto';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ServiceError } from './firebase.js';
import { ensureActivityDay } from './activityStore.js';

const dayMs = 86400000;
const offsetMs = 6 * 3600000;
export function campaignDay(now = new Date()) { return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10); }
export function nextReset(now = new Date()) { return new Date((Math.floor((now.getTime() - offsetMs) / dayMs) + 1) * dayMs + offsetMs).toISOString(); }
function iso(value) { return value?.toDate?.().toISOString() || null; }
export function publicCoupon(data) {
  return data ? { code: data.code, won: data.won, day: data.day, createdAt: iso(data.createdAt), wonAt: iso(data.wonAt), redeemedAt:iso(data.redeemedAt), revealed: true } : null;
}
export function publicReview(data, id, participant) {
  return { id, rating: data.rating, comment: data.comment, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt), isMine: id === participant };
}

export async function readState(db, participant, now = new Date()) {
  const day = campaignDay(now);
  const [coupon, review] = await db.getAll(db.doc(`coupons/${day}_${participant}`), db.doc(`reviews/${participant}`));
  return { day, nextResetAt: nextReset(now), coupon: publicCoupon(coupon.data()), review: review.exists ? publicReview(review.data(), review.id, participant) : null };
}

export async function drawDailyCoupon(db, participant, { now = new Date(), candidateWins = randomInt(15) === 0 } = {}) {
  const day = campaignDay(now);
  const couponRef = db.doc(`coupons/${day}_${participant}`);
  const dailyRef = db.doc(`dailyPrizes/${day}`);
  await ensureActivityDay(db,day);
  // Draw once per request; transaction retries never draw again.
  const createdAt = Timestamp.fromDate(now);
  const code = `ANV-${randomBytes(6).toString('hex').toUpperCase()}`;
  const outcome = await db.runTransaction(async transaction => {
    const [existing, daily] = await transaction.getAll(couponRef, dailyRef);
    if (existing.exists) return { coupon: existing.data(), isNew: false };
    const won = candidateWins && !daily.exists;
    const coupon = { code, day, won, createdAt, wonAt: won ? createdAt : null };
    transaction.create(couponRef, coupon);
    transaction.set(db.doc(`dailyActivity/${day}`),{day,count:FieldValue.increment(1),version:1,updatedAt:createdAt},{merge:true});
    // Creation precondition + read conflict protects the one global slot.
    if (won) transaction.create(dailyRef, { code, couponId: couponRef.id, wonAt: createdAt });
    return { coupon, isNew: true };
  });
  return { coupon: publicCoupon(outcome.coupon), isNew: outcome.isNew, day, nextResetAt: nextReset(now) };
}

export function validateReview(value) {
  if (!Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5) throw new ServiceError(400, 'Selecciona entre 1 y 5 estrellas.');
  if (typeof value.comment !== 'string' || value.comment.length > 600) throw new ServiceError(400, 'El comentario puede tener hasta 600 caracteres.');
  return { rating: value.rating, comment: value.comment.trim() };
}

export async function writeReview(db, participant, value, now = new Date()) {
  const input = validateReview(value);
  const reviewRef = db.doc(`reviews/${participant}`);
  const statsRef = db.doc('stats/reviews');
  const review = await db.runTransaction(async transaction => {
    const previous = await transaction.get(reviewRef);
    const old = previous.data();
    if (old?.rating === input.rating && old.comment === input.comment) return old;
    if (old && now.getTime() - old.updatedAt.toMillis() < 15000) throw new ServiceError(429, 'Espera unos segundos antes de actualizar tu reseña.');
    const next = { ...input, createdAt: old?.createdAt || Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now) };
    transaction.set(reviewRef, next);
    // Atomic increments avoid a shared read lock when many visitors review at once.
    transaction.set(statsRef, { count: FieldValue.increment(old ? 0 : 1), sum: FieldValue.increment(input.rating - (old?.rating || 0)) }, {merge:true});
    return next;
  });
  return { review: publicReview(review, participant, participant) };
}

export async function listReviews(db, participant, cursor) {
  let query = db.collection('reviews').orderBy('updatedAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
  if (cursor) {
    let decoded;
    try { decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()); } catch { /* Invalid cursor below. */ }
    if (!decoded || !Number.isSafeInteger(decoded.time) || !/^[a-f0-9]{64}$/.test(decoded.id)) throw new ServiceError(400, 'No pudimos abrir esa página de reseñas.');
    query = query.startAfter(Timestamp.fromMillis(decoded.time), decoded.id);
  }
  const [page, summary] = await Promise.all([query.limit(21).get(), db.doc('stats/reviews').get()]);
  const rows = page.docs.slice(0, 20);
  const stats = summary.data() || { count: 0, sum: 0 };
  const last = rows.at(-1);
  const nextCursor = page.size > 20 ? Buffer.from(JSON.stringify({ time: last.data().updatedAt.toMillis(), id: last.id })).toString('base64url') : null;
  return { reviews: rows.map(row => publicReview(row.data(), row.id, participant)), count: stats.count, average: stats.count ? stats.sum / stats.count : 0, nextCursor };
}
