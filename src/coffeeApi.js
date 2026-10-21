async function request(view, payload, signal) {
  let response;
  try {
    response = await fetch(`/api/experience${view ? `?${new URLSearchParams(view)}` : ''}`, {
      method: payload ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal,
      ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Estamos preparando las tarjetas. Vuelve en un momento.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No pudimos completar la solicitud. Inténtalo de nuevo.');
  return data;
}
let sessionReady;
export function loadCoffeeState(signal) { return request({ view: 'state' }, null, signal); }
export function ensureCoffeeSession() { return sessionReady ||= loadCoffeeState().catch(error => { sessionReady = null; throw error; }); }
export async function revealCoffee() { await ensureCoffeeSession(); return request(null, { action: 'play' }); }
export async function submitCoffeeReview(rating, comment) { await ensureCoffeeSession(); return request(null, { action: 'review', rating, comment }); }
export async function loadCoffeeReviews(cursor, signal) { await ensureCoffeeSession(); return request({ view: 'reviews', ...(cursor ? { cursor } : {}) }, null, signal); }
