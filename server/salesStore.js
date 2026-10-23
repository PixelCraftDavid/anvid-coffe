import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { ServiceError } from './firebase.js';
import { campaignDay } from './coffeeStore.js';
import { saleDefaults, saleLocations } from '../shared/salesConfig.js';

const emptyTotals = () => ({ quantity: 0, orders: 0, revenueCents: 0, costCents: 0, profitCents: 0 });
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function validateSale(value) {
  if (!idPattern.test(value?.requestId || '')) throw new ServiceError(400, 'No pudimos identificar la venta. Vuelve a intentarlo.');
  if (!saleLocations.some(location => location.id === value.locationId)) throw new ServiceError(400, 'Selecciona UTVM o centro.');
  if (!Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 100) throw new ServiceError(400, 'Registra entre 1 y 100 cafés.');
  const { unitPriceCents = saleDefaults.unitPriceCents, unitCostCents = saleDefaults.unitCostCents } = value;
  for (const amount of [unitPriceCents, unitCostCents]) if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) throw new ServiceError(400, 'Revisa el precio y costo: deben ser importes válidos en centavos.');
  return { requestId: value.requestId, locationId: value.locationId, quantity: value.quantity, unitPriceCents, unitCostCents };
}
function publicSale(data, id) {
  return { id, locationId: data.locationId, quantity: data.quantity, unitPriceCents: data.unitPriceCents, unitCostCents: data.unitCostCents, revenueCents: data.revenueCents, costCents: data.costCents, profitCents: data.profitCents, day: data.day, createdAt: data.createdAt.toDate().toISOString(), voidedAt: data.voidedAt?.toDate().toISOString() || null };
}
function changeTotals(previous, sale, sign) {
  const next = { ...emptyTotals(), ...previous };
  for (const key of ['quantity', 'revenueCents', 'costCents', 'profitCents']) next[key] += sign * sale[key];
  next.orders += sign;
  return next;
}
function changeDay(previous, sale, sign, now) {
  const byLocation = { ...previous?.byLocation, [sale.locationId]: changeTotals(previous?.byLocation?.[sale.locationId], sale, sign) };
  return { ...changeTotals(previous, sale, sign), day: sale.day, byLocation, updatedAt: now };
}
export async function recordSale(db, value, now = new Date()) {
  const input = validateSale(value), day = campaignDay(now), createdAt = Timestamp.fromDate(now);
  const saleRef = db.doc(`sales/${input.requestId}`), dayRef = db.doc(`dailySales/${day}`);
  const sale = { ...input, day, createdAt, revenueCents: input.quantity * input.unitPriceCents, costCents: input.quantity * input.unitCostCents, profitCents: input.quantity * (input.unitPriceCents - input.unitCostCents), voidedAt: null };
  const result = await db.runTransaction(async transaction => {
    const [existing, daily] = await transaction.getAll(saleRef, dayRef);
    if (existing.exists) {
      const saved = existing.data();
      if (saved.voidedAt || Object.keys(input).some(key => input[key] !== saved[key])) throw new ServiceError(409, 'Esta solicitud ya pertenece a otra venta. Actualiza el panel antes de continuar.');
      return { sale: saved, isNew: false };
    }
    transaction.create(saleRef, sale);
    transaction.set(dayRef, changeDay(daily.data(), sale, 1, createdAt));
    return { sale, isNew: true };
  });
  return { sale: publicSale(result.sale, saleRef.id), isNew: result.isNew };
}
export async function voidSale(db, id, now = new Date()) {
  if (!idPattern.test(id || '')) throw new ServiceError(400, 'Esta venta no es válida.');
  const ref = db.doc(`sales/${id}`), stamp = Timestamp.fromDate(now);
  const data = await db.runTransaction(async transaction => {
    const saved = await transaction.get(ref);
    if (!saved.exists) throw new ServiceError(404, 'No encontramos esa venta.');
    const sale = saved.data();
    if (sale.voidedAt) return sale;
    const dayRef = db.doc(`dailySales/${sale.day}`), daily = await transaction.get(dayRef);
    if (!daily.exists || daily.data().quantity < sale.quantity) throw new ServiceError(409, 'No pudimos reconciliar esta venta. Actualiza el panel.');
    transaction.update(ref, { voidedAt: stamp });
    transaction.set(dayRef, changeDay(daily.data(), sale, -1, stamp));
    return { ...sale, voidedAt: stamp };
  });
  return { sale: publicSale(data, id) };
}
export async function salesOverview(db, now = new Date()) {
  const today = campaignDay(now), start = campaignDay(new Date(now.getTime() - 89 * 86400000));
  const [daily, recent] = await Promise.all([
    db.collection('dailySales').orderBy(FieldPath.documentId()).startAt(start).endAt(today).get(),
    db.collection('sales').orderBy('createdAt', 'desc').limit(20).get(),
  ]);
  const values = new Map(daily.docs.map(row => [row.id, row.data()]));
  const days = Array.from({ length: 90 }, (_, index) => {
    const day = campaignDay(new Date(now.getTime() - (89 - index) * 86400000)), saved = values.get(day);
    return { ...emptyTotals(), ...saved, day, updatedAt: undefined, byLocation: Object.fromEntries(saleLocations.map(location => [location.id, { ...emptyTotals(), ...saved?.byLocation?.[location.id] }])) };
  });
  return { defaults: saleDefaults, locations: saleLocations, days, today: days.at(-1), recentSales: recent.docs.map(row => publicSale(row.data(), row.id)) };
}
