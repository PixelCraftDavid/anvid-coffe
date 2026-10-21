import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Volume2, VolumeX, X } from 'lucide-react';
import { WIN_CELEBRATION as WIN } from './winCelebrationTimeline';
import { scheduleWinCelebrationAudio } from './experienceAudio';
import PrizeTimestamp from './PrizeTimestamp.jsx';

const ease = [.23, 1, .32, 1];
const balloonColours = ['#e5d297','#c4d6aa','#eadbca','#b9d7cd','#cfae97','#d9dba9','#b4cbb7'];
const balloonTargets = [[-205,-10],[-145,-110],[-225,-180],[205,-10],[145,-110],[225,-180],[-185,20]];

function Balloon({ index, colour }) {
  const id = `balloon-light-${index}`;
  return <svg viewBox="0 0 76 150" fill="none" aria-hidden="true"><defs><radialGradient id={id} cx=".3" cy=".25" r=".8"><stop stopColor="#fff8e8"/><stop offset=".2" stopColor={colour}/><stop offset=".78" stopColor={colour}/><stop offset="1" stopColor="#394d36"/></radialGradient></defs><ellipse cx="38" cy="40" rx="31" ry="38" fill={`url(#${id})`}/><path d="m38 77-4 7h8l-4-7Z" fill={colour}/><ellipse cx="25" cy="23" rx="7" ry="13" transform="rotate(27 25 23)" fill="#fff" opacity=".22"/><path d="M38 84c-17 17 15 29 1 43-6 6-6 12-2 21" stroke="#e6edd0" strokeOpacity=".65" strokeWidth=".7"/></svg>;
}

export default function WinCelebration({ onClose, resultTitleRef, wonAt, sound, onToggleSound }) {
  const dialogRef = useRef(null);
  const continueRef = useRef(null);
  const reduce = useReducedMotion();
  const epochRef=useRef(0);
  const stopAudioRef=useRef(null);
  const [assetsReady,setAssetsReady]=useState(false);
  const [cupFailed,setCupFailed]=useState(false);
  const lead=reduce?0:WIN.leadIn/1000;
  const close=()=>{stopAudioRef.current?.();onClose();};
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width:620px)').matches);

  useEffect(()=>{
    let active=true;
    const decode=src=>new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>{if(image.decode) image.decode().then(resolve,reject);else resolve();};
      image.onerror=reject;image.src=src;
    });
    Promise.allSettled(['/images/anvid-open-cup.webp','/images/anvid-lid.webp'].map(decode)).then(results=>{
      if(active){setCupFailed(results[0].status==='rejected');setAssetsReady(true);}
    });
    return()=>{active=false;};
  },[]);
  useLayoutEffect(()=>{if(assetsReady)epochRef.current=performance.now()+WIN.leadIn;},[assetsReady]);

  useEffect(()=>{
    if(!sound || !assetsReady) return;
    const stop=scheduleWinCelebrationAudio(epochRef.current,!!reduce);
    stopAudioRef.current=stop;
    return ()=>{stop();if(stopAudioRef.current===stop) stopAudioRef.current=null;};
  },[sound,reduce,assetsReady]);

  useEffect(() => {
    const query = window.matchMedia('(max-width:620px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    continueRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      resultTitleRef.current?.focus({ preventScroll: true });
    };
  }, [resultTitleRef]);

  return <dialog ref={dialogRef} className="celebration-dialog" aria-labelledby="celebration-title" aria-describedby="celebration-description" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="win-theatre">
      <div className="win-theatre-glass" aria-hidden="true"/>
      <div className="party-lights" aria-hidden="true"><i/><i/><i/><i/></div>
      <button className="celebration-sound" onClick={onToggleSound} aria-label={sound?'Silenciar celebración':'Activar sonido de la celebración'} aria-pressed={sound}>{sound?<Volume2 size={16} strokeWidth={1.5}/>:<VolumeX size={16} strokeWidth={1.5}/>}</button>
      <button className="celebration-close" onClick={close} aria-label="Cerrar celebración y ver mi premio"><X size={18} strokeWidth={1.5}/></button>
      <header className="win-theatre-heading"><h2 id="celebration-title">¡Ganaste<br/><em>un café!</em></h2><p id="celebration-description">Hoy invitamos nosotros.<br/>Tú disfruta este pequeño golpe de suerte.</p></header>
      <div className="celebration-stage" aria-hidden="true">
        {assetsReady && !reduce && <div className="balloon-launch">{balloonColours.map((colour, i) => <motion.div className="party-balloon" key={colour} initial={{ opacity: 0, transform: 'translate(calc(-50% + 0px), 45px) rotate(0deg) scale(.5)' }} animate={{ opacity: 1, transform: `translate(calc(-50% + ${balloonTargets[i][0] * (compact ? .7 : 1)}px), ${balloonTargets[i][1]}px) rotate(${(i - 3) * 5}deg) scale(1)` }} transition={{ duration: 2.8 + i * .1, delay: lead+(WIN.balloons+i*WIN.balloonStagger)/1000, ease, opacity: { duration: .5, delay: lead+(WIN.balloons+i*WIN.balloonStagger)/1000 } }}><Balloon index={i} colour={colour}/></motion.div>)}</div>}
        {assetsReady && !reduce && <div className="cup-confetti">{Array.from({length:compact?28:52},(_,i) => {
          const direction = Math.sin(i * 2.4), reach = 90 + i % 11 * 17;
          return <motion.i key={i} style={{ backgroundColor: ['#e9d28d','#cadfa9','#eadcc9','#b6d6c9','#d8a5a0'][i%5], width: i%3===0?5:7, height:i%3===0?10:5 }} initial={{ opacity: 0, transform:'translate(0px, 0px) rotate(0deg)' }} animate={{ opacity:[0,1,1,0], transform:[`translate(0px, 0px) rotate(0deg)`,`translate(${direction*reach*.65}px, ${-100-i%7*15}px) rotate(${i*37}deg)`,`translate(${direction*reach}px, ${-30+i%5*15}px) rotate(${i*53}deg)`,`translate(${direction*reach*1.2}px, 320px) rotate(${i*79}deg)`] }} transition={{ duration:2.5+i%5*.12, delay:lead+(WIN.confetti+i%8*WIN.confettiStagger)/1000, times:[0,.25,.5,1], ease:'linear' }}/>;
        })}</div>}
        {assetsReady && !cupFailed && <motion.div className="celebration-cup" initial={{ opacity:0, transform:reduce?'translate(-50%, 0px)':'translate(-50%, 65px) rotate(-15deg) scale(.7)' }} animate={{ opacity:1, transform:'translate(-50%, 0px) rotate(0deg) scale(1)' }} transition={reduce?{duration:.2}:{type:'spring',duration:.7,bounce:.25,delay:lead}}>
          <img className="celebration-cup-body" src="/images/anvid-open-cup.webp" alt="" draggable="false"/>
          <motion.img className="celebration-lid" src="/images/anvid-lid.webp" alt="" draggable="false" initial={{ transform:'translate(0px, 0px) rotate(0deg)',opacity:1 }} animate={reduce?{opacity:0}:{transform:`translate(${compact?54:100}px, -38px) rotate(24deg)`,opacity:[1,1,.85]}} transition={reduce?{duration:.2}:{type:'spring',duration:1.1,bounce:.24,delay:lead+WIN.lid/1000}}/>
          <span className="cup-celebration-glow"/>
        </motion.div>}
        {!assetsReady && <span className="celebration-loading">Tu café está llegando…</span>}
        {cupFailed && <span className="celebration-loading">Un café para alegrarte el día.</span>}
      </div>
      <footer className="win-theatre-footer"><PrizeTimestamp value={wonAt}/><button ref={continueRef} className="action" onClick={close}><span>Ver mi premio</span><span className="action-arrow"><ArrowUpRight size={19}/></span></button><p>UN CAFÉ. UN PEQUEÑO GOLPE DE SUERTE.</p></footer>
    </div>
  </dialog>;
}
