import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {animate,motion,useMotionTemplate,useMotionValue,useReducedMotion} from 'motion/react';
import {MoveUpRight,Rotate3d} from 'lucide-react';

const dateLabel=day=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));
const colors=['#282f2b','#174f3c','#23754f','#41aa69','#a2e792'];
const monthLabel=day=>new Intl.DateTimeFormat('es-MX',{month:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`)).replace('.','');

export default function ActivityMap({data,loading}) {
  const [depth,setDepth]=useState(false),[selected,setSelected]=useState(364),[width,setWidth]=useState(1000);
  const host=useRef(null),scroller=useRef(null),gesture=useRef(null);
  const reduce=useReducedMotion(),pitch=useMotionValue(0),yaw=useMotionValue(0),zoom=useMotionValue(1);
  const boardWidth=Math.max(660,width-65);
  const transform=useMotionTemplate`translate(-50%, -50%) rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom})`;
  const resetView=useCallback(()=>{
    const options={duration:reduce?0:.28,ease:[.23,1,.32,1]};
    return [animate(pitch,depth?52:0,options),animate(yaw,depth?26:0,options),animate(zoom,depth?Math.min(.78,(width-64)/boardWidth):1,options)];
  },[depth,width,boardWidth,reduce,pitch,yaw,zoom]);
  useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{const controls=resetView();return()=>controls.forEach(control=>control.stop());},[resetView]);
  useEffect(()=>{if(!depth&&scroller.current)scroller.current.scrollLeft=scroller.current.scrollWidth;},[depth,width,data]);
  const cells=useMemo(()=>{
    if(!data)return [];
    const lead=(new Date(`${data.start}T12:00:00Z`).getUTCDay()+6)%7;
    const max=Math.max(1,...data.days.map(day=>day.count||0));
    return [...Array.from({length:lead},(_,i)=>({empty:true,key:`empty-${i}`})),...data.days.map((item,index)=>({...item,index,key:item.day,level:item.count?Math.min(4,Math.max(1,Math.ceil(item.count/max*4))):0,height:item.count?10+Math.sqrt(item.count/max)*70:2}))];
  },[data]);
  const months=cells.flatMap((cell,index)=>!cell.empty&&(cell.day.endsWith('-01')||cell.index===0)?[{label:monthLabel(cell.day),column:Math.floor(index/7)+1}]:[]);
  const current=data?.days[selected]||data?.days.at(-1);
  function keydown(event){
    if(['Enter',' '].includes(event.key)){event.preventDefault();setDepth(value=>!value);return;}
    const delta={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1}[event.key];
    if(delta!==undefined||event.key==='Home'||event.key==='End'){event.preventDefault();setSelected(value=>event.key==='Home'?0:event.key==='End'?364:Math.max(0,Math.min(364,value+delta)));}
  }
  function pointerDown(event){gesture.current={x:event.clientX,y:event.clientY,pitch:pitch.get(),yaw:yaw.get(),moved:false};if(depth)event.currentTarget.setPointerCapture(event.pointerId);}
  function pointerMove(event){const start=gesture.current;if(!start||!event.buttons)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.hypot(dx,dy)>6)start.moved=true;if(depth&&start.moved){pitch.set(Math.max(20,Math.min(70,start.pitch-dy*.25)));yaw.set(Math.max(-35,Math.min(60,start.yaw+dx*.18)));}}
  function click(){if(!gesture.current?.moved)setDepth(value=>!value);gesture.current=null;}
  return <section className="activity-section" id="actividad" aria-labelledby="activity-title">
    <div className="section-heading"><div><h2 id="activity-title">Un año. Muchos cafés.</h2><p>El ritmo de Anvid, día por día.</p></div><div className="activity-totals"><strong>{data?.total??'—'}</strong><span>tarjetas registradas<br/>en los últimos 365 días</span></div></div>
    <div ref={host} className={`activity-map ${depth?'is-depth':''}`}>
      <div className="map-toolbar"><span className="map-date" aria-live="polite">{current?`${dateLabel(current.day)} · ${current.count===null?'registro pendiente':`${current.count} ${current.count===1?'tarjeta':'tarjetas'}`}`:'Consultando participaciones…'}</span><span className="map-view-label" aria-hidden="true">{depth?<Rotate3d size={14}/>:<MoveUpRight size={14}/>} {depth?'Perspectiva':'Actividad'}</span></div>
      <div ref={scroller} className={`heatmap-scroll ${depth?'is-depth':''}`}>
        <div className={`heatmap-scene ${depth?'is-depth':''}`} role="button" tabIndex={0} aria-pressed={depth} aria-label={`Mapa de actividad. ${depth?'Vista 3D. Pulsa para volver a 2D.':'Vista 2D. Pulsa para explorar en 3D.'} Usa las flechas para consultar los días.`} aria-describedby="map-instructions" onKeyDown={keydown} onClick={click} onDoubleClick={()=>{if(depth)resetView();}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{gesture.current={moved:true};}} style={{minWidth:depth?0:`${boardWidth+38}px`}}>
          {data?<motion.div className="heatmap-board" style={{width:boardWidth,transform}}>
            <div className="map-months" aria-hidden="true">{months.map((month,i)=><span key={`${month.column}-${i}`} style={{gridColumn:month.column}}>{month.label}</span>)}</div>
            <div className="map-weekdays" aria-hidden="true"><span>lun</span><span>mié</span><span>vie</span></div>
            <div className="heatmap-cells" aria-hidden="true">{cells.map(cell=>cell.empty?<span key={cell.key}/>:<span key={cell.key} className={`heatmap-cell ${selected===cell.index?'is-selected':''} ${cell.count===null?'is-unknown':''}`} onPointerEnter={()=>setSelected(cell.index)} title={`${dateLabel(cell.day)}: ${cell.count??'pendiente'}`}>
              <i className="cell-front" style={{height:cell.height,background:colors[cell.level],transform:`translateZ(${depth?cell.height:0}px) rotateX(-90deg) scaleY(${depth?1:0})`}}/>
              <i className="cell-side" style={{width:cell.height,background:colors[cell.level],transform:`translateZ(${depth?cell.height:0}px) rotateY(90deg) scaleX(${depth?1:0})`}}/>
              <i className="cell-top" style={{background:colors[cell.level],transform:`translateZ(${depth?cell.height:0}px)`}}/>
            </span>)}</div>
          </motion.div>:<p className="map-loading" role="status">{loading?'Preparando tu mapa de actividad…':'El mapa aparecerá al conectar con la barra.'}</p>}
        </div>
      </div>
      <div className="map-footer"><p id="map-instructions">{depth?'Arrastra para girar. Toca de nuevo para volver a 2D.':'Toca el mapa y mira cómo cobra profundidad.'}</p><div className="map-legend" aria-label="Verde más claro significa más participaciones"><span>Menos</span>{colors.map(color=><i key={color} style={{background:color}}/>)}<span>Más</span></div></div>
    </div>
    {data?.incomplete&&<p className="activity-migration-note">Estamos recuperando el historial anterior. Los días pendientes no se muestran como cero.</p>}
  </section>;
}
