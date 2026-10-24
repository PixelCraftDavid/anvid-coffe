import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,TrendingUp,Coffee,Star,QrCode,ArrowUpRight,MapPin,ShieldCheck,ArrowRight,AlertCircle} from 'lucide-react';
import {periodSales,money} from './salesModel.js';
import {adminRequest} from './api.js';
import ReviewCards from './ReviewCards.jsx';
import {mergeReviewHead} from './liveModel.js';

export const workspacePages=[
  {id:'panel',name:'Resumen',description:'Una mirada clara a tu café.',icon:LayoutDashboard},
  {id:'ventas',name:'Ventas',description:'Registra, compara y entiende tus ingresos.',icon:TrendingUp},
  {id:'actividad',name:'Actividad',description:'Cada participación, con su propia dimensión.',icon:Coffee},
  {id:'opiniones',name:'Opiniones',description:'Escucha lo que deja cada taza.',icon:Star},
  {id:'canjes',name:'Canjes',description:'Valida cada premio y cuida cada entrega.',icon:QrCode},
];
export function workspacePage(hash){const name=hash.replace('#','');return ['validar','cupones'].includes(name)?'canjes':name==='registrar'?'ventas':workspacePages.some(page=>page.id===name)?name:'panel';}
export function WorkspaceNav({active,local,waitingCount=0}){
  return <aside className="workspace-sidebar"><a className="workspace-brand" href="/">anvid<span>LA BARRA</span></a><nav aria-label="Apartados del dashboard">{workspacePages.map(({id,name,description,icon:Icon})=><a key={id} href={`#${id}`} aria-label={name} aria-current={active===id?'page':undefined}><Icon size={19} strokeWidth={1.6}/><span>{name}{id==='ventas'&&waitingCount>0&&<b className="workspace-request-count" aria-hidden="true">{waitingCount}</b>}<small>{description}</small></span><ArrowUpRight className="sidebar-link-arrow" size={15}/></a>)}</nav><div className="sidebar-bottom"><div className="sidebar-coffee"><img src="/images/anvid-studio.webp" alt="" width="1536" height="1024"/><p>Hecho de<br/><em>buen café.</em></p></div><div className="sidebar-place"><MapPin size={17}/><span>Ixmiquilpan<small>UTVM & Centro</small></span></div><div className="sidebar-private"><ShieldCheck size={14}/>{local?'Datos de prueba local':'Espacio privado'}</div></div></aside>;
}
export function BusinessPulse({sales}){
 const report=periodSales(sales?.days,7),total=report.totals.quantity;
 return <section className="studio-locations surface"><div><h2>Así se reparte<br/><em>tu semana.</em></h2><p>{sales?total: String.fromCharCode(8212)} cafés en los últimos 7 días</p></div><div className="studio-location-bars">{['utvm','centro'].map(id=>{const count=report.byLocation[id]?.quantity||0;return <div key={id}><div><span>{id==='utvm'?'UTVM':'Centro'}</span><strong>{count} cafés</strong></div><div className="location-bar-track"><i style={{transform:typeof total==='number'?'scaleX('+(total?count/total:0)+')':undefined}}/></div></div>;})}</div><a href="#ventas">Explorar ventas <ArrowUpRight size={16}/></a></section>;
}
export function DailyNotes({data,dateText}){
  const last=data?.sales?.recentSales.find(sale=>!sale.voidedAt);
  return <section className="daily-notes surface"><h2>En la barra.</h2><dl><div><dt><Coffee size={17}/>El café del día</dt><dd>{!data?'Consultando…':data.summary.prizeAvailable?'Todavía por ganar':'Ya tiene dueño'}</dd></div><div><dt><Star size={17}/>El café, según tus clientes</dt><dd>{data?.summary.reviewCount?`${data.summary.average.toFixed(1)} de 5 · ${data.summary.reviewCount} opiniones`:'Aún sin opiniones'}</dd></div><div><dt><TrendingUp size={17}/>Última venta registrada</dt><dd>{last?`${money(last.revenueCents)} · ${dateText(last.createdAt)}`:'Tu primera venta aparecerá aquí'}</dd></div></dl><a href="#canjes">Abrir estación de canje <ArrowRight size={16}/></a></section>;
}
export function ActivityNotes({data}){
  return <div className="activity-notes"><section className="surface"><h2>El ritmo, en contexto.</h2><dl><div><dt>Días con participaciones</dt><dd>{data?.activityYear?.activeDays??'—'}</dd></div><div><dt>Tarjetas registradas hoy</dt><dd>{data?.summary.today??'—'}</dd></div><div><dt>Cafés canjeados</dt><dd>{data?.summary.redeemed??'—'}</dd></div></dl></section><section className="activity-guide surface"><Coffee size={25} strokeWidth={1.3}/><h2>Otra forma<br/><em>de ver tu historia.</em></h2><p>Toca el mapa para elevarlo a 3D. Arrastra para girar y vuelve a tocarlo para regresar al plano.</p><span>Con teclado: Enter cambia la vista y las flechas recorren los días.</span></section></div>;
}
export function ReviewDesk({revision,onExpired,dateText}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[more,setMore]=useState(false),[retry,setRetry]=useState(0);
  const generation=useRef(0),pending=useRef(false),hasData=useRef(false);
  useEffect(()=>{const current=++generation.current;pending.current=false;setMore(false);if(!hasData.current)setLoading(true);setError('');adminRequest({view:'reviews'}).then(value=>{if(current===generation.current){hasData.current=true;setData(previous=>mergeReviewHead(previous,value));}},error=>{if(current===generation.current){if(error.status===401)onExpired();else setError(error.message);}}).finally(()=>{if(current===generation.current)setLoading(false);});return()=>{generation.current++;};},[revision,retry]);
  async function next(){if(pending.current||loading||!data?.nextCursor)return;const current=generation.current;pending.current=true;setMore(true);setError('');try{const page=await adminRequest({view:'reviews',cursor:data.nextCursor});if(current===generation.current)setData(previous=>({...page,reviews:[...previous.reviews,...page.reviews.filter(row=>!previous.reviews.some(old=>old.id===row.id))]}));}catch(error){if(current===generation.current){if(error.status===401)onExpired();else setError(error.message);}}finally{if(current===generation.current){pending.current=false;setMore(false);}}}
  return <div className="review-desk">{loading?<div className="surface panel-skeleton" role="status">Preparando tus opiniones…</div>:data&&<ReviewCards variant="board" reviews={data.reviews} summary={{reviewCount:data.count,average:data.average}} dateText={dateText}/>} {error&&<p className="admin-error surface" role="alert"><AlertCircle size={16}/>{error}<button className="admin-text-button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></p>}{!loading&&data?.nextCursor&&<button className="admin-secondary review-more" disabled={more} onClick={next}>{more?'Cargando…':'Cargar más opiniones'}<ArrowRight size={16}/></button>}</div>;
}
