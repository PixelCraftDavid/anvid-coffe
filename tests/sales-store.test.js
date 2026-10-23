import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { validateSale, recordSale, voidSale, salesOverview } from '../server/salesStore.js';
import { chartGeometry, periodSales, tilePoint } from '../src/admin/salesModel.js';

const input = overrides => ({ requestId: randomUUID(), locationId: 'utvm', quantity: 1, ...overrides });
test('ventas: importes enteros en centavos, cantidades y puntos de venta válidos', () => {
  assert.deepEqual(validateSale(input({ requestId: '191b3897-c378-4019-8557-a91ca928984c' })), { requestId: '191b3897-c378-4019-8557-a91ca928984c', locationId: 'utvm', quantity: 1, unitPriceCents: 3000, unitCostCents: 995 });
  for (const quantity of [0, -1, 101, 1.5, '2']) assert.throws(() => validateSale(input({ quantity })), { status: 400 });
  for (const unitPriceCents of [-1, 9.95, '3000', 1000001, NaN]) assert.throws(() => validateSale(input({ unitPriceCents })), { status: 400 });
  assert.throws(() => validateSale(input({ unitCostCents: -1 })), { status: 400 });
  assert.throws(() => validateSale(input({ locationId: 'otra-universidad' })), { status: 400 });
  assert.throws(() => validateSale(input({ requestId: '../prize' })), { status: 400 });
});

test('ventas: filtros de periodo, gráficas con ceros/pérdidas y puntos geográficos finitos', () => {
  const days = Array.from({ length: 30 }, (_, index) => ({ day: `2027-04-${String(index + 1).padStart(2, '0')}`, quantity: 1, orders: 1, revenueCents: 3000, costCents: 995, profitCents: 2005, byLocation: { utvm: { quantity: 1, revenueCents: 3000 } } }));
  const report = periodSales(days, 7); assert.equal(report.rows.length, 7); assert.equal(report.totals.revenueCents, 21000); assert.equal(report.totals.profitCents, 14035); assert.equal(report.byLocation.utvm.quantity, 7);
  assert.equal(periodSales([], 7).totals.quantity, 0);
  for (const rows of [[], days, [{ day: '2027-04-01', profitCents: -500 }]]) {
    const chart = chartGeometry(rows, 'profitCents'); assert.ok(chart.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.y >= 0 && point.y <= 200));
  }
  const utvm = tilePoint(20.49579, -99.18307), centro = tilePoint(20.4849, -99.2182); assert.ok(utvm.x > centro.x && utvm.y < centro.y);
});

const emulator = /^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '');
const app = emulator ? initializeApp({ projectId: `demo-anvid-sales-${Date.now()}` }, 'sales-tests') : null;
const db = app ? getFirestore(app) : null;
after(async () => { if (app) { await db.terminate(); await deleteApp(app); } });

test('Firestore ventas: reintentos simultáneos cuentan una venta y no modifican cupones ni premios', { skip: !emulator }, async () => {
  const value = input(), now = new Date('2027-04-01T18:00:00Z');
  const results = await Promise.all(Array.from({ length: 12 }, () => recordSale(db, value, now)));
  assert.equal(results.filter(result => result.isNew).length, 1);
  const overview = await salesOverview(db, now);
  assert.deepEqual(overview.today.byLocation.utvm, { quantity: 1, orders: 1, revenueCents: 3000, costCents: 995, profitCents: 2005 });
  assert.equal(overview.today.profitCents, 2005); assert.equal(overview.recentSales.length, 1);
  for (const name of ['coupons', 'dailyPrizes', 'dailyDraws', 'dailyActivity', 'reviews']) assert.equal((await db.collection(name).get()).size, 0);
  await assert.rejects(() => recordSale(db, { ...value, quantity: 2 }, now), { status: 409 });
});

test('Firestore ventas: registros concurrentes por zona y anulación idempotente en su fecha original', { skip: !emulator }, async () => {
  const now = new Date('2027-04-02T18:00:00Z');
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => recordSale(db, input({ locationId: index % 2 ? 'centro' : 'utvm', quantity: 3 }), now)));
  const overview = await salesOverview(db, now);
  assert.equal(overview.today.quantity, 36); assert.equal(overview.today.revenueCents, 108000); assert.equal(overview.today.costCents, 35820); assert.equal(overview.today.profitCents, 72180);
  assert.equal(overview.today.byLocation.utvm.quantity, 18); assert.equal(overview.today.byLocation.centro.quantity, 18);
  const sale = results[0].sale, later = new Date('2027-04-03T18:00:00Z');
  await Promise.all(Array.from({ length: 12 }, () => voidSale(db, sale.id, later)));
  const updated = await salesOverview(db, later), original = updated.days.find(day => day.day === '2027-04-02');
  assert.equal(original.quantity, 33); assert.equal(original.orders, 11); assert.equal(original.profitCents, 66165); assert.equal(original.byLocation.utvm.quantity, 15); assert.equal(updated.today.quantity, 0);
  const stored = (await db.doc(`sales/${sale.id}`).get()).data(); assert.equal(stored.revenueCents, 9000); assert.equal(stored.unitCostCents, 995); assert.ok(stored.voidedAt);
  await assert.rejects(() => recordSale(db, { requestId: sale.id, locationId: sale.locationId, quantity: sale.quantity }, later), { status: 409 });
});

test('Firestore ventas: medianoche UTC−6, costos históricos y utilidad negativa sin inventar ingresos', { skip: !emulator }, async () => {
  const before = new Date('2027-04-04T05:59:59Z'), after = new Date('2027-04-04T06:00:00Z');
  await recordSale(db, input({ unitPriceCents: 500, unitCostCents: 1000 }), before);
  await recordSale(db, input({ locationId: 'centro', unitPriceCents: 3500, unitCostCents: 1100 }), after);
  const overview = await salesOverview(db, after);
  assert.equal(overview.days.length, 90); assert.equal(overview.today.day, '2027-04-04'); assert.equal(overview.today.revenueCents, 3500); assert.equal(overview.today.profitCents, 2400);
  const oldSale = overview.recentSales.find(sale => sale.unitPriceCents === 500); assert.equal(oldSale.profitCents, -500); assert.equal(oldSale.day, '2027-04-03');
  await assert.rejects(() => voidSale(db, randomUUID()), { status: 404 });
});
