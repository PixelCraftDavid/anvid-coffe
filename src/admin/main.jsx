import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Coffee,RefreshCw,LogOut,ArrowUpRight,ArrowRight,LockKeyhole,AlertCircle,Star,ShieldCheck,Receipt,LayoutDashboard,QrCode,TrendingUp,MapPin} from 'lucide-react';
import {adminRequest} from './api.js';
import ActivityMap from './ActivityMap.jsx';
import ReviewCards from './ReviewCards.jsx';
import RedemptionStation from './RedemptionStation.jsx';
import {FinancialOverview,SaleEntry,SalesChart,LocationMap,SalesHistory} from './SalesStudio.jsx';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './panel.css';
import './dashboard.css';

const dateText=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('es-MX',{timeZone:'Etc/GMT+6',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
const stateText=coupon=>coupon.redeemedAt?'Canjeado':coupon.won?'Disponible':'Sin premio';
function Status({coupon}){return <span className={`coupon-status ${coupon.redeemedAt?'used':coupon.won?'available':'no-prize'}`}><i/>{stateText(coupon)}</span>;}

function AmbientWave(){
  const root=useRef(null);
  useEffect(()=>{const update=()=>{if(root.current)root.current.dataset.paused=String(document.hidden);};document.addEventListener('visibilitychange',update);update();return()=>document.removeEventListener('visibilitychange',update);},[]);
  return <div className="dashboard-backdrop" ref={root} aria-hidden="true"><div className="wave-field wave-field-one"/><div className="wave-field wave-field-two"/><div className="wave-texture"/></div>;
}

function Login({onLogin,error:initialError,checking}) {
  const [password,setPassword]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(event){event.preventDefault();if(submitting.current)return;submitting.current=true;setPending(true);setError('');try{const session=await adminRequest(null,{action:'login',password});setPassword('');onLogin(session);}catch(error){setError(error.message);}finally{submitting.current=false;setPending(false);}}
  return <><AmbientWave/><main className="admin-login"><section className="login-story"><a className="admin-wordmark" href="/">anvid<span>LA BARRA</span></a><div><Coffee size={50} strokeWidth={1}/><h1>Tu café.<br/><em>Una nueva mirada.</em></h1><p>Ventas, opiniones y pequeños premios.<br/>El pulso de Anvid, en un solo lugar.</p></div><span className="login-story-footer">IXMIQUILPAN · UTVM & CENTRO</span></section><section className="login-entry"><div className="login-form-wrap"><LockKeyhole size={22} strokeWidth={1.4}/><h2>Tu turno<br/><em>en la barra.</em></h2><p>Entra para registrar ventas y cuidar cada canje.</p>{checking?<p role="status">Comprobando tu sesión…</p>:<form onSubmit={submit}><label htmlFor="admin-password">Contraseña privada</label><input id="admin-password" type="password" name="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event=>setPassword(event.target.value)} disabled={pending}/><button className="admin-primary" disabled={pending}>{pending?'Entrando…':'Entrar al panel'}<ArrowRight size={18}/></button>{(error||initialError)&&<p className="admin-error" role="alert"><AlertCircle size={16}/>{error||initialError}</p>}</form>}<div className="login-privacy"><ShieldCheck size={16}/><p>Acceso protegido. La contraseña se verifica en el servidor.</p></div><a href="/" className="admin-text-button">Volver al café <ArrowUpRight size={14}/></a></div></section></main></>;
}

function Dashboard({session,onExpired,onLogout}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[more,setMore]=useState(false),[selectedCode,setSelectedCode]=useState(null),[logoutPending,setLogoutPending]=useState(false);
  const mounted=useRef(true),refreshPending=useRef(false),morePending=useRef(false);
  const [navigation,setNavigation]=useState(location.hash||'#panel');
  const [period,setPeriod]=useState(7);
  useEffect(()=>{const update=()=>setNavigation(location.hash||'#panel');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  function expired(error){if(error.status===401){onExpired();return true;}return false;}
  async function refresh(){if(refreshPending.current)return;refreshPending.current=true;setLoading(true);setError('');try{const next=await adminRequest({view:'dashboard'});if(mounted.current)setData(next);}catch(error){if(!expired(error)&&mounted.current)setError(error.message);}finally{refreshPending.current=false;if(mounted.current)setLoading(false);}}
  useEffect(()=>{mounted.current=true;refresh();const expire=()=>{if(Date.now()>=Date.parse(session.expiresAt))onExpired();};const timer=setTimeout(expire,Math.max(0,Date.parse(session.expiresAt)-Date.now()));document.addEventListener('visibilitychange',expire);return()=>{mounted.current=false;clearTimeout(timer);document.removeEventListener('visibilitychange',expire);};},[]);
  async function nextPage(){if(morePending.current||!data?.nextCursor)return;morePending.current=true;setMore(true);try{const page=await adminRequest({view:'coupons',cursor:data.nextCursor});if(mounted.current)setData(previous=>({...previous,...page,coupons:[...previous.coupons,...page.coupons.filter(row=>!previous.coupons.some(existing=>existing.code===row.code))]}));}catch(error){if(!expired(error)&&mounted.current)setError(error.message);}finally{morePending.current=false;if(mounted.current)setMore(false);}}
  async function logout(){setLogoutPending(true);try{await adminRequest(null,{action:'logout'});onLogout();}catch(error){if(mounted.current)setError(error.message);}finally{if(mounted.current)setLogoutPending(false);}}
  const rows=data?.coupons.filter(coupon=>filter==='all'||filter==='available'&&coupon.won&&!coupon.redeemedAt||filter==='used'&&coupon.redeemedAt)||[];
  const today=data?.day?new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${data.day}T12:00:00Z`)):'Conectando con Anvid…';
  return <><AmbientWave/><div className="admin-shell" id="panel">
      <header className="admin-topbar arrival"><a className="topbar-brand" href="/">anvid<span>La barra</span></a><nav aria-label="Panel privado"><a href="#panel" aria-current={navigation==='#panel'?'location':undefined}><LayoutDashboard size={15}/><span>Resumen</span></a><a href="#ventas" aria-current={navigation==='#ventas'?'location':undefined}><TrendingUp size={15}/><span>Ventas</span></a><a href="#actividad" aria-current={navigation==='#actividad'?'location':undefined}><Coffee size={15}/><span>Actividad</span></a><a href="#opiniones" aria-current={navigation==='#opiniones'?'location':undefined}><Star size={15}/><span>Opiniones</span></a><a href="#validar" aria-current={navigation==='#validar'?'location':undefined}><QrCode size={15}/><span>Canjear</span></a></nav><div className="topbar-actions"><span className="private-tag"><i/>{session.local?'Prueba local':'Privado'}</span><button className="admin-icon-button" disabled={logoutPending} onClick={logout} aria-label="Cerrar sesión"><LogOut size={18}/></button></div></header>
      <main className="admin-page">
      <div className="dashboard-masthead arrival"><div><h1 className="dashboard-title" tabIndex={0}>ANVID<span className="title-dot">.</span></h1><p>El pulso de tu café.</p></div><div className="masthead-meta"><span><MapPin size={14}/>Ixmiquilpan, Hidalgo</span><time>{today}</time><button className="masthead-refresh" disabled={loading} onClick={refresh}><RefreshCw size={15} className={loading?'is-refreshing':''}/><span>Actualizar panel</span></button></div></div>
      {error&&<p className="admin-error page-error" role="alert"><AlertCircle size={16}/>{error}<button className="admin-text-button" onClick={refresh}>Reintentar</button></p>}
      <div className="overview-grid arrival"><FinancialOverview sales={data?.sales} summary={data?.summary} loading={loading}/><SaleEntry onRecorded={refresh} onExpired={onExpired}/></div>
      <div className="insights-grid arrival"><SalesChart sales={data?.sales} period={period} onPeriod={setPeriod} loading={loading}/><LocationMap sales={data?.sales} period={period}/></div>
      <div className="activity-wrap arrival"><ActivityMap data={data?.activityYear} loading={loading}/></div>
      <div className="people-grid"><ReviewCards reviews={data?.reviews} summary={data?.summary} dateText={dateText}/><div className="redemption-wrap"><RedemptionStation selectedCode={selectedCode} onCodeHandled={()=>setSelectedCode(null)} onRedeemed={refresh} onExpired={onExpired} dateText={dateText} Status={Status}/><div className="daily-prize-status"><Coffee size={18}/><div><strong>{data?(data.summary.prizeAvailable?'El premio de hoy sigue disponible.':'El premio de hoy ya tiene dueño.'):'Consultando el premio…'}</strong><p>Reinicio diario a medianoche · UTC−6</p></div></div></div></div>
      <SalesHistory sales={data?.sales} onChanged={refresh} onExpired={onExpired} dateText={dateText}/>
      <section className="ledger-section surface" id="cupones" aria-labelledby="coupons-title"><div className="section-heading"><div><h2 id="coupons-title">Pequeños golpes de suerte.</h2><p>Cupones y canjes. Los más recientes primero.</p></div><Receipt size={25} strokeWidth={1.2}/></div><div className="ledger-filters" aria-label="Filtrar cupones">{[['all','Todos'],['available','Por canjear'],['used','Canjeados']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}</button>)}</div><div className="ledger-scroll"><table><thead><tr><th>Cupón</th><th>Emitido</th><th>Estado</th><th><span className="visually-hidden">Validar</span></th></tr></thead><tbody>{rows.map(coupon=><tr key={coupon.code}><td><span className="table-code">{coupon.code}</span><small>{coupon.won?'Café de cortesía':'Participación'}</small></td><td>{dateText(coupon.createdAt)}</td><td><Status coupon={coupon}/></td><td><button className="admin-icon-button" aria-label={`Revisar ${coupon.code}`} onClick={()=>{setSelectedCode(coupon.code);document.getElementById('validar')?.scrollIntoView({behavior:'auto',block:'start'});}}><ArrowUpRight size={18}/></button></td></tr>)}</tbody></table></div>{!rows.length&&!loading&&<div className="admin-empty"><Receipt size={25} strokeWidth={1.2}/><p>{filter==='all'?'Todavía no hay cupones registrados.':'No hay cupones de este tipo en la lista cargada.'}</p></div>}{data?.nextCursor&&<button className="admin-text-button ledger-more" disabled={more} onClick={nextPage}>{more?'Cargando…':'Cargar más cupones'}<ArrowRight size={15}/></button>}</section>
      <footer className="admin-footer"><a href="/">anvid</a><span><ShieldCheck size={13}/> Los canjes se verifican en el servidor.</span><span>{data?`Actualizado ${dateText(data.updatedAt)}`:'Conectando con la barra…'}</span></footer>
    </main>
  </div></>;
}

function AdminApp(){
  const [phase,setPhase]=useState('checking'),[session,setSession]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;adminRequest({view:'session'}).then(value=>{if(active){setSession(value);setPhase('ready');}},error=>{if(active){setPhase('guest');if(error.status!==401)setError(error.message);}});return()=>{active=false;};},[]);
  if(phase!=='ready')return <Login checking={phase==='checking'} error={error} onLogin={value=>{setSession(value);setPhase('ready');setError('');}}/>;
  return <Dashboard session={session} onExpired={()=>{setSession(null);setPhase('guest');setError('Tu sesión terminó. Vuelve a entrar.');}} onLogout={()=>{setSession(null);setPhase('guest');setError('');}}/>;
}
const root=import.meta.hot?.data.root||createRoot(document.getElementById('root'));
if(import.meta.hot)import.meta.hot.data.root=root;
root.render(<AdminApp/>);
