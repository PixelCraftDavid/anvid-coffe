import {useEffect,useMemo,useRef,useState} from 'react';
import {MoveUpRight,Rotate3d} from 'lucide-react';
import {activityModel,createActivityRenderer} from './activityMapRenderer.js';

const dateFormat=new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const dateLabel=day=>dateFormat.format(new Date(`${day}T12:00:00Z`));
const colors=['#282f2b','#174f3c','#23754f','#41aa69','#a2e792'];

export default function ActivityMap({data,loading}) {
  const [depth,setDepth]=useState(false),[selected,setSelected]=useState(364),[unavailable,setUnavailable]=useState(false);
  const canvas=useRef(null),host=useRef(null),renderer=useRef(null),gesture=useRef(null),depthRef=useRef(depth);
  depthRef.current=depth;
  const model=useMemo(()=>data?activityModel(data):null,[data]);
  useEffect(()=>{
    if(!model||!canvas.current)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const drawing=createActivityRenderer(canvas.current,model,{reducedMotion:media.matches});
    renderer.current=drawing;
    if(!drawing){setUnavailable(true);return;}
    setUnavailable(false);drawing.setDepth(depthRef.current);
    let inView=true;
    const visibility=()=>drawing.setVisible(inView&&!document.hidden);
    const motionPreference=()=>drawing.setReduced(media.matches);
    const resize=new ResizeObserver(entries=>{const rect=entries[0].contentRect;drawing.resize(rect.width,rect.height,window.devicePixelRatio||1);});
    resize.observe(host.current);
    const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;visibility();},{rootMargin:'80px'}):null;
    intersection?.observe(host.current);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',motionPreference);visibility();
    return()=>{resize.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motionPreference);drawing.dispose();if(renderer.current===drawing)renderer.current=null;};
  },[model]);
  useEffect(()=>{renderer.current?.setDepth(depth);},[depth]);
  useEffect(()=>{renderer.current?.select(selected);},[selected,model]);
  const current=data?.days[selected]||data?.days.at(-1);
  function choose(index,ensureVisible=false){if(index===null)return;setSelected(index);renderer.current?.select(index,ensureVisible);}
  function keydown(event){
    if(['Enter',' '].includes(event.key)){event.preventDefault();setDepth(value=>!value);return;}
    const delta={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1}[event.key];
    if(delta!==undefined||event.key==='Home'||event.key==='End'){event.preventDefault();choose(event.key==='Home'?0:event.key==='End'?364:Math.max(0,Math.min(364,selected+delta)),true);}
  }
  function pointerDown(event){const pose=renderer.current?.pose();gesture.current={x:event.clientX,y:event.clientY,pitch:pose?.pitch||52,yaw:pose?.yaw||26,pan:pose?.pan||0,moved:false};if(depth)event.currentTarget.setPointerCapture(event.pointerId);}
  function pointerMove(event){
    const start=gesture.current;
    if(start&&event.buttons){const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.hypot(dx,dy)>6)start.moved=true;if(start.moved){if(depth)renderer.current?.drag(start.pitch-dy*.25,start.yaw+dx*.18);else renderer.current?.pan(start.pan+dx);}return;}
    if(event.pointerType==='mouse'&&!event.buttons){const rect=event.currentTarget.getBoundingClientRect();choose(renderer.current?.hit(event.clientX-rect.left,event.clientY-rect.top)??null);}
  }
  function click(event){if(!gesture.current?.moved){const rect=event.currentTarget.getBoundingClientRect();choose(renderer.current?.hit(event.clientX-rect.left,event.clientY-rect.top)??null);setDepth(value=>!value);}gesture.current=null;}
  return <section className="activity-section" id="actividad" aria-labelledby="activity-title">
    <div className="section-heading"><div><h2 id="activity-title">Un año. Muchos cafés.</h2><p>El ritmo de Anvid, día por día.</p></div><div className="activity-totals"><strong>{data?.total??'—'}</strong><span>tarjetas registradas<br/>en los últimos 365 días</span></div></div>
    <div className={`activity-map ${depth?'is-depth':''}`}>
      <div className="map-toolbar"><span className="map-date" aria-live="polite">{current?`${dateLabel(current.day)} · ${current.count===null?'registro pendiente':`${current.count} ${current.count===1?'tarjeta':'tarjetas'}`}`:'Consultando participaciones…'}</span><span className="map-view-label" aria-hidden="true">{depth?<Rotate3d size={14}/>:<MoveUpRight size={14}/>} {depth?'Perspectiva':'Actividad'}</span></div>
      <div ref={host} className={`heatmap-scene ${depth?'is-depth':''}`} role="button" tabIndex={0} aria-pressed={depth} aria-label={`Mapa de actividad. ${depth?'Vista 3D. Pulsa para volver a 2D.':'Vista 2D. Pulsa para explorar en 3D.'} Usa las flechas para consultar los días.`} aria-describedby="map-instructions" onKeyDown={keydown} onClick={click} onDoubleClick={()=>{if(depth)renderer.current?.reset();}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{gesture.current={moved:true};}}>
        {data?<canvas ref={canvas} className="activity-canvas" aria-hidden="true"/>:<p className="map-loading" role="status">{loading?'Preparando tu mapa de actividad…':'El mapa aparecerá al conectar con la barra.'}</p>}
        {unavailable&&<p className="map-loading">{data?.total??0} tarjetas registradas. Este navegador no puede dibujar el mapa; puedes consultar sus días con las flechas.</p>}
      </div>
      <div className="map-footer"><p id="map-instructions">{depth?'Arrastra para girar. Toca de nuevo para volver a 2D.':'Toca para ver en 3D. Desliza para explorar el año.'}</p><div className="map-legend" aria-label="Verde más claro significa más participaciones"><span>Menos</span>{colors.map(color=><i key={color} style={{background:color}}/>)}<span>Más</span></div></div>
    </div>
    {data?.incomplete&&<p className="activity-migration-note">Estamos recuperando el historial anterior. Los días pendientes no se muestran como cero.</p>}
  </section>;
}
