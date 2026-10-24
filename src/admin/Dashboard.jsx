import {useEffect,useRef,useState} from 'react';
import {RefreshCw,LogOut,ArrowUpRight,ArrowRight,AlertCircle,Receipt,ShieldCheck,Coffee,Plus,MapPin} from 'lucide-react';
import {adminRequest} from './api.js';
import ActivityMap from './ActivityMap.jsx';
import RedemptionStation from './RedemptionStation.jsx';
import {FinancialOverview,SaleEntry,SalesChart,LocationMap,SalesHistory} from './SalesStudio.jsx';
import {WorkspaceNav,workspacePages,workspacePage,BusinessPulse,DailyNotes,ActivityNotes,ReviewDesk} from './Workspace.jsx';

const dateText=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('es-MX',{timeZone:'Etc/GMT+6',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
function Status({coupon}){return <span className={`coupon-status ${coupon.redeemedAt?'used':coupon.won?'available':'no-prize'}`}><i/>{coupon.redeemedAt?'Canjeado':coupon.won?'Disponible':'Sin premio'}</span>;}

export default function Dashboard({session,onExpired,onLogout,children}){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [filter,setFilter]=useState('all'),[more,setMore]=useState(false),[selectedCode,setSelectedCode]=useState(null),[logoutPending,setLogoutPending]=useState(false);
  const [navigation,setNavigation]=useState(()=>workspacePage(location.hash)),[period,setPeriod]=useState(7);
  const mounted=useRef(true),refreshPending=useRef(false),morePending=useRef(false),viewRef=useRef(null);
  const page=workspacePages.find(page=>page.id===navigation);

  useEffect(()=>{
    const update=()=>{setNavigation(workspacePage(location.hash));window.scrollTo({top:0,behavior:'instant'});};
    window.addEventListener('hashchange',update);
    return()=>window.removeEventListener('hashchange',update);
  },[]);
  useEffect(()=>{document.title=`${page.name} · Anvid Coffe`;},[page.name]);
  useEffect(()=>{
    // Decorative motion runs only on visible surfaces. No per-frame React work.
    const elements=viewRef.current?.querySelectorAll('[data-ambient]');
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.dataset.inView=String(entry.isIntersecting);}),{rootMargin:'40px'}):null;
    elements?.forEach(element=>observer?.observe(element));
    return()=>observer?.disconnect();
  },[navigation]);
  function expired(error){if(error.status===401){onExpired();return true;}return false;}
  async function refresh(){
    if(refreshPending.current)return;
    refreshPending.current=true;setLoading(true);setError('');
    try{const next=await adminRequest({view:'dashboard'});if(mounted.current)setData(next);}
    catch(error){if(!expired(error)&&mounted.current)setError(error.message);}
    finally{refreshPending.current=false;if(mounted.current)setLoading(false);}
  }
  useEffect(()=>{
    mounted.current=true;refresh();
    const expire=()=>{if(Date.now()>=Date.parse(session.expiresAt))onExpired();};
    const timer=setTimeout(expire,Math.max(0,Date.parse(session.expiresAt)-Date.now()));
    document.addEventListener('visibilitychange',expire);
    return()=>{mounted.current=false;clearTimeout(timer);document.removeEventListener('visibilitychange',expire);};
  },[]);
  async function nextPage(){
    if(morePending.current||!data?.nextCursor)return;
    morePending.current=true;setMore(true);
    try{const page=await adminRequest({view:'coupons',cursor:data.nextCursor});if(mounted.current)setData(previous=>({...previous,...page,coupons:[...previous.coupons,...page.coupons.filter(row=>!previous.coupons.some(existing=>existing.code===row.code))]}));}
    catch(error){if(!expired(error)&&mounted.current)setError(error.message);}
    finally{morePending.current=false;if(mounted.current)setMore(false);}
  }
  async function logout(){setLogoutPending(true);try{await adminRequest(null,{action:'logout'});onLogout();}catch(error){if(mounted.current)setError(error.message);}finally{if(mounted.current)setLogoutPending(false);}}
  const rows=data?.coupons.filter(coupon=>filter==='all'||filter==='available'&&coupon.won&&!coupon.redeemedAt||filter==='used'&&coupon.redeemedAt)||[];
  const today=data?.day?new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${data.day}T12:00:00Z`)):'Conectando con Anvid…';

  return <>{children}<div className="admin-shell workspace-shell">
    <a href="#workspace-content" className="workspace-skip" onClick={event=>{event.preventDefault();document.getElementById('workspace-content')?.focus();}}>Saltar al contenido</a>
    <WorkspaceNav active={navigation} local={session.local}/>
    <main className="admin-page workspace-main" id="workspace-content" tabIndex={-1}>
      <header className="workspace-toolbar"><span className="workspace-place"><MapPin size={14}/>Ixmiquilpan, Hidalgo</span><div className="workspace-tools"><span className="private-tag"><i/>{session.local?'Prueba local':'Privado'}</span><button className="admin-icon-button" disabled={loading} onClick={refresh} aria-label="Actualizar panel"><RefreshCw size={17} className={loading?'is-refreshing':''}/></button><button className="admin-icon-button" disabled={logoutPending} onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
      <div className="workspace-masthead"><div><h1 className="dashboard-title" tabIndex={0}>{page.name}<span className="title-dot">.</span></h1><p>{page.description}</p></div><div className="workspace-heading-meta"><time>{today}</time>{navigation!=='ventas'&&<a className="workspace-sale-link" href="#ventas"><Plus size={16}/>Registrar venta</a>}</div></div>
      {error&&<p className="admin-error page-error" role="alert"><AlertCircle size={16}/>{error}<button className="admin-text-button" onClick={refresh}>Reintentar</button></p>}
      <div className={`workspace-view view-${navigation}`} key={navigation} ref={viewRef}>
        {navigation==='panel'&&<>
          <div className="workspace-overview"><FinancialOverview sales={data?.sales} summary={data?.summary} loading={loading}/><BusinessPulse sales={data?.sales}/></div>
          <div className="workspace-summary-bottom"><SalesChart sales={data?.sales} period={period} onPeriod={setPeriod} loading={loading}/><DailyNotes data={data} dateText={dateText}/></div>
        </>}
        {navigation==='ventas'&&<>
          <div className="sales-workbench"><SalesChart sales={data?.sales} period={period} onPeriod={setPeriod} loading={loading}/><SaleEntry onRecorded={refresh} onExpired={onExpired}/></div>
          <LocationMap sales={data?.sales} period={period}/>
          <SalesHistory sales={data?.sales} onChanged={refresh} onExpired={onExpired} dateText={dateText}/>
        </>}
        {navigation==='actividad'&&<><ActivityMap data={data?.activityYear} loading={loading}/><ActivityNotes data={data}/></>}
        {navigation==='opiniones'&&<ReviewDesk revision={data?.updatedAt} onExpired={onExpired} dateText={dateText}/>}
        {navigation==='canjes'&&<>
          <div className="redemption-workbench"><RedemptionStation selectedCode={selectedCode} onCodeHandled={()=>setSelectedCode(null)} onRedeemed={refresh} onExpired={onExpired} dateText={dateText} Status={Status}/><section className="prize-brief" data-ambient><div className="prize-orbit" aria-hidden="true"><Coffee size={37} strokeWidth={1.1}/><i/><i/></div><h2>Un premio.<br/><em>Una entrega.</em></h2><p>{data?(data.summary.prizeAvailable?'El café de hoy todavía está por ganar.':'El premio de hoy ya tiene dueño.'):'Consultando el premio del día…'}</p><div><ShieldCheck size={16}/><span>El QR se valida en el servidor y solo puede canjearse una vez.</span></div><small>Reinicio diario a medianoche · UTC−6</small></section></div>
          <section className="ledger-section surface" aria-labelledby="coupons-title"><div className="section-heading"><div><h2 id="coupons-title">El recorrido de cada cupón.</h2><p>Emisión, disponibilidad y canje. Los más recientes primero.</p></div><Receipt size={25} strokeWidth={1.2}/></div><div className="ledger-filters" aria-label="Filtrar cupones">{[['all','Todos'],['available','Por canjear'],['used','Canjeados']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}</button>)}</div><div className="ledger-scroll"><table><thead><tr><th>Cupón</th><th>Emitido</th><th>Estado</th><th><span className="visually-hidden">Validar</span></th></tr></thead><tbody>{rows.map(coupon=><tr key={coupon.code}><td><span className="table-code">{coupon.code}</span><small>{coupon.won?'Café de cortesía':'Participación'}</small></td><td>{dateText(coupon.createdAt)}</td><td><Status coupon={coupon}/></td><td><button className="admin-icon-button" aria-label={`Revisar ${coupon.code}`} onClick={()=>{setSelectedCode(coupon.code);document.getElementById('validar')?.scrollIntoView({behavior:'instant',block:'start'});}}><ArrowUpRight size={18}/></button></td></tr>)}</tbody></table></div>{!rows.length&&!loading&&<div className="admin-empty"><Receipt size={25} strokeWidth={1.2}/><p>{filter==='all'?'Todavía no hay cupones registrados.':'No hay cupones de este tipo en la lista cargada.'}</p></div>}{data?.nextCursor&&<button className="admin-text-button ledger-more" disabled={more} onClick={nextPage}>{more?'Cargando…':'Cargar más cupones'}<ArrowRight size={15}/></button>}</section>
        </>}
      </div>
      <footer className="admin-footer workspace-footer"><a href="/">anvid</a><span><ShieldCheck size={13}/>Tu barra, en orden.</span><span>{data?`Actualizado ${dateText(data.updatedAt)}`:'Conectando con la barra…'}</span></footer>
    </main>
  </div></>;
}
