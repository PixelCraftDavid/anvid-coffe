export const money = cents => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format((cents || 0) / 100);
export function periodSales(days = [], period = 7) {
  const rows = days.slice(-period), totals = { quantity: 0, revenueCents: 0, costCents: 0, profitCents: 0, orders: 0 }, byLocation = {};
  for (const day of rows) {
    for (const key of Object.keys(totals)) totals[key] += day[key] || 0;
    for (const [id, value] of Object.entries(day.byLocation || {})) {
      byLocation[id] ||= { ...Object.fromEntries(Object.keys(totals).map(key => [key, 0])) };
      for (const key of Object.keys(totals)) byLocation[id][key] += value[key] || 0;
    }
  }
  return { rows, totals, byLocation };
}
export function tilePoint(lat, lng, zoom = 13) {
  const size = 256 * 2 ** zoom, radians = lat * Math.PI / 180;
  return { x: (lng + 180) / 360 * size, y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * size };
}
export function chartGeometry(rows, key = 'revenueCents') {
  const max = Math.max(10000, ...rows.map(day => Math.abs(day[key] || 0))), negative = rows.some(day => day[key] < 0);
  const baseline = negative ? 108 : 196, scale = (negative ? 90 : 175) / max;
  const points = rows.map((day, i) => ({ x: 40 + i / Math.max(1, rows.length - 1) * 536, y: baseline - (day[key] || 0) * scale, ...day }));
  return { points, max, baseline, path: points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ') };
}
