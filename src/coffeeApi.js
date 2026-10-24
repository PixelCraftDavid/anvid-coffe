import {tokenFromText} from './playPassToken.js';
let playToken;
function saveToken(token){playToken=token;try{token?sessionStorage.setItem('anvid.playPass',token):sessionStorage.removeItem('anvid.playPass');}catch{/* The in-memory pass still works. */}}
export function acceptPlayPass(value){const token=tokenFromText(value,location.origin);if(!token)throw new Error('Pega el enlace completo o el código de participación de tu compra.');saveToken(token);}
export function forgetPlayPass(){saveToken(null);}
function currentToken(){
  if(location.hash.startsWith('#p=')){acceptPlayPass(`${location.origin}/${location.hash}`);history.replaceState(null,'',`${location.pathname}${location.search}#inicio`);}
  if(playToken===undefined){try{playToken=sessionStorage.getItem('anvid.playPass');}catch{playToken=null;}}
  return playToken;
}
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
export async function loadCoffeeState(signal) {
  const state=await request({view:'state'},null,signal);let token;
  if(location.hash==='#jugar'){
    forgetPlayPass();history.replaceState(null,'',`${location.pathname}${location.search}#inicio`);
    if(!state.request||['expired','cancelled'].includes(state.request.status))return {...state,...await request(null,{action:'requestPlay'},signal)};
    return state;
  }
  try{token=currentToken();}catch(error){forgetPlayPass();history.replaceState(null,'',`${location.pathname}${location.search}#inicio`);return {...state,coupon:null,purchase:{status:'invalid',message:error.message}};}
  if(!token)return {...state,purchase:state.purchase||null};
  try{return {...state,...await request(null,{action:'passState',token},signal)};}catch(error){if(error.name==='AbortError')throw error;return {...state,coupon:null,purchase:{status:'invalid',message:error.message}};}
}
export function ensureCoffeeSession() { return sessionReady ||= loadCoffeeState().catch(error => { sessionReady = null; throw error; }); }
export async function revealCoffee() { await ensureCoffeeSession(); return request(null, { action: 'play',token:currentToken() }); }
export async function requestPlay(){await ensureCoffeeSession();forgetPlayPass();return request(null,{action:'requestPlay'});}
export function loadAuthorization(signal){return request({view:'authorization'},null,signal);}
export async function submitCoffeeReview(rating, comment) { await ensureCoffeeSession(); return request(null, { action: 'review', rating, comment }); }
export async function loadCoffeeReviews(cursor, signal) { await ensureCoffeeSession(); return request({ view: 'reviews', ...(cursor ? { cursor } : {}) }, null, signal); }
