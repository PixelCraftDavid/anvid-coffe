import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {ArrowUpRight,Coffee,Check,ShieldCheck,SlidersHorizontal,Wallet,Banknote,TrendingUp} from 'lucide-react';
import {money,chartGeometry} from './salesModel.js';
import {folderPath} from './useFolderContours.js';

export function StudioHero(){
  const contour=`folder-${useId().replace(/:/g,'')}`;
  const folder=useRef(null),innerPath=useRef(null),outerPath=useRef(null);
  const cup=useRef(null),bounds=useRef(null),frame=useRef(0);
  useLayoutEffect(()=>{
    const element=folder.current,hero=element?.querySelector('.studio-hero');
    if(!hero||!innerPath.current||!outerPath.current)return;
    function measure(){
      const w=element.clientWidth,h=element.clientHeight,padding=hero.offsetLeft;
      const column=matchMedia('(min-width:701px)').matches?(w-32)/3:w,anchor=column*.38;
      outerPath.current.setAttribute('d',folderPath(w,h,anchor,true));
      innerPath.current.setAttribute('d',folderPath(hero.clientWidth,hero.clientHeight,anchor-padding,true));
    }
    measure();const resize=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;resize?.observe(element);
    return()=>resize?.disconnect();
  },[]);
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
  function move(event){if(event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const rect=bounds.current;if(!rect)return;const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{if(cup.current)cup.current.style.transform=`translate3d(${x*7}px,${y*4}px,35px) rotateX(${-y*5}deg) rotateY(${x*7}deg)`;});}
  return <div className="studio-folder has-layered-cup" ref={folder} style={{'--folder-frame':`url(#${contour}-frame)`}} data-ambient onPointerEnter={event=>{bounds.current=event.currentTarget.getBoundingClientRect();}} onPointerMove={move} onPointerLeave={()=>{cancelAnimationFrame(frame.current);if(cup.current)cup.current.style.transform='translate3d(0,0,35px) rotateX(0deg) rotateY(0deg)';}}><svg width="0" height="0" className="folder-definitions" aria-hidden="true"><defs><clipPath id={`${contour}-frame`} clipPathUnits="userSpaceOnUse"><path ref={outerPath}/></clipPath><clipPath id={contour} clipPathUnits="userSpaceOnUse"><path ref={innerPath}/></clipPath></defs></svg><section className="studio-hero" aria-labelledby="studio-hero-title" style={{clipPath:`url(#${contour})`}}><img className="studio-hero-photo" src="/images/anvid-scene.webp" alt="" width="1200" height="1500"/><div className="studio-hero-copy"><h2 id="studio-hero-title">Cada café<br/><em>cuenta.</em></h2><p>Tu negocio, a tu ritmo.<br/>Todo lo que importa, en la barra.</p><a href="#ventas">Registrar una venta <ArrowUpRight size={17}/></a></div><div className="studio-beans" aria-hidden="true">{[0,1,2].map(n=><img key={n} src="/images/coffee-bean.webp" alt="" width="42" height="55"/>)}</div></section><div className="studio-cup-stage" aria-hidden="true"><div className="studio-cup-shadow"/><div className="studio-cup-parallax" ref={cup}><img className="studio-cup-3d" src="/images/anvid-cup.webp" alt="" width="850" height="1169" fetchPriority="high"/></div><img className="studio-front-bean" src="/images/coffee-bean.webp" alt="" width="42" height="55"/></div></div>;
}
export function FinancialOverview({sales,loading}){
  const today=sales?.today,rows=sales?.days?.slice(-7)||[];
  return <section className="studio-financials" aria-label="Resumen financiero de hoy">{[
    {id:'revenueCents',name:'Ingresos de hoy',icon:Wallet,detail:today?`${today.quantity} ${today.quantity===1?'café vendido':'cafés vendidos'}`:'Consultando ventas'},
    {id:'costCents',name:'Costo de preparación',icon:Banknote,detail:'Con el costo de cada venta'},
    {id:'profitCents',name:'Utilidad estimada',icon:TrendingUp,detail:'Antes de otros gastos y cortesías'},
  ].map(({id,name,icon:Icon,detail})=><article className={`financial-tile tile-${id}`} key={id}><div className="financial-tile-label"><span><Icon size={22} strokeWidth={1.5}/></span><h2>{name}</h2>{loading&&<i className="tile-loading" aria-label="Actualizando"/>}</div><strong key={today?.[id]} className="metric-reveal">{today?money(today[id]):'—'}</strong><p>{detail}</p><svg viewBox="0 0 610 235" className="tile-spark" aria-hidden="true" preserveAspectRatio="none"><path d={chartGeometry(rows,id).path}/></svg></article>)}</section>;
}
function savedGoal(){try{const n=Number(localStorage.getItem('anvid.admin.dailyGoal'));if(Number.isInteger(n)&&n>0&&n<=500)return n;}catch{/* Local preferences are optional. */}return 15;}
export function DailyGoal({sales}){
  const [goal,setGoal]=useState(savedGoal),[editing,setEditing]=useState(false),[draft,setDraft]=useState(String(goal));
  const quantity=sales?.today?.quantity||0,progress=Math.min(1,quantity/goal),valid=Number.isInteger(Number(draft))&&Number(draft)>0&&Number(draft)<=500;
  function save(event){event.preventDefault();if(!valid)return;setGoal(Number(draft));setEditing(false);try{localStorage.setItem('anvid.admin.dailyGoal',String(Number(draft)));}catch{/* Still works for this visit. */}}
  return <section className="daily-goal surface"><div className="goal-heading"><h2>A tu ritmo.</h2><button className="admin-icon-button" aria-label="Editar meta diaria" aria-expanded={editing} onClick={()=>{setDraft(String(goal));setEditing(value=>!value);}}><SlidersHorizontal size={16}/></button></div><div className="goal-body"><div className="goal-dial"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="49"/><circle className="goal-progress" cx="60" cy="60" r="49" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/></svg><Coffee size={30} strokeWidth={1.5}/></div><div><span>Meta de hoy</span><strong>{sales?quantity:'—'} <small>/ {goal}</small></strong><p>cafés registrados</p></div></div>{editing&&<form onSubmit={save}><label htmlFor="daily-goal">Cafés por día<input id="daily-goal" type="number" inputMode="numeric" min="1" max="500" value={draft} onChange={event=>setDraft(event.target.value)} required/></label><button className="admin-icon-button" disabled={!valid} aria-label="Guardar meta diaria"><Check size={19}/></button><small>Preferencia de este dispositivo.</small></form>}<p className="goal-caption">{quantity>=goal?'Meta alcanzada. Disfruta ese pequeño logro.':`${Math.round(progress*100)}% del camino. Una taza a la vez.`}</p></section>;
}
export function RedemptionBrief({data}){
  return <section className="studio-redemption-brief"><div className="redemption-photo"><img src="/images/anvid-studio.webp" alt="" width="1536" height="1024" loading="lazy"/></div><div className="redemption-brief-copy"><h2>Cada entrega,<br/><em>bien cuidada.</em></h2><p>{data?(data.summary.prizeAvailable?'El café de hoy todavía está por ganar.':'El premio de hoy ya tiene dueño.'):'Consultando el café del día…'}</p><ol><li>Consulta el QR o el código.</li><li>Revisa que siga disponible.</li><li>Confirma al entregar el café.</li></ol><div><ShieldCheck size={17}/><span>Una validación en el servidor.<br/>Un solo canje por cupón.</span></div></div></section>;
}
