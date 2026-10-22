import React, { useEffect, useRef, useState } from 'react';

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, Coffee, Fingerprint, Check, Star, Download, Volume2, VolumeX, Vibrate, VibrateOff, Heart, ExternalLink } from 'lucide-react';
import { cafe, readSaved, saveLocal } from './config';
import { ensureCoffeeSession, loadCoffeeState, revealCoffee, submitCoffeeReview } from './coffeeApi.js';
import FluidBackdrop from './FluidBackdrop';
import CafeReviews from './CafeReviews';
import CoffeeObjects from './CoffeeObjects';
import WinCelebration from './WinCelebration';
import PaperToss from './PaperToss';
import { setExperienceSound, playResultTone, createScratchSound } from './experienceAudio';
import PrizeTimestamp from './PrizeTimestamp.jsx';
import { formatPrizeTimestamp } from './prizeDateTime.js';
import { createExperienceHaptics } from './experienceHaptics.js';
import CoffeeWelcome from './CoffeeWelcome.jsx';
import LiquidGlass from './LiquidGlass.jsx';
import CouponQr from './CouponQr.jsx';
import QRCode from 'qrcode';


const ease = [0.23, 1, 0.32, 1];

function Flower({ className = '', ...props }) {
  return <svg viewBox="0 0 64 64" fill="none" className={`flower ${className}`} aria-hidden="true" {...props}><path d="M32 6c6-15 18 2 11 12 14-8 29 6 14 13 15 7 0 22-14 14 7 14-9 27-15 12-7 15-22 0-14-14C0 51-10 35 5 29-10 22 6 8 20 16 13 2 29-9 32 6Z" fill="currentColor"/><circle cx="31" cy="31" r="9" fill="var(--paper)"/></svg>;
}

function Logo({ light = false, compact = false }) {
  return <a href="#inicio" className={`logo ${light ? 'logo-light' : ''}`} aria-label="Anvid Coffe, inicio"><span className="logo-name">anvid<Flower className="logo-star"/></span>{!compact && <span className="logo-sub">COFFE & LITTLE RITUALS</span>}</a>;
}

function Action({ children, onClick, className = '', light = false, ...props }) {
  return <button onClick={onClick} className={`action ${light ? 'action-light' : ''} ${className}`} {...props}><span>{children}</span><span className="action-arrow"><ArrowUpRight size={20} strokeWidth={1.5}/></span></button>;
}

function ScratchSurface({ pending, onReveal, sound = false, onScratchStart, haptics }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const previous = useRef(null);
  const activePointer = useRef(null);
  const scratchSound = useRef(null);
  const progressCells = useRef(new Set());
  const finished = useRef(false);
  const [progress, setProgress] = useState(0);
  const [touching, setTouching] = useState(false);
  const [ready, setReady] = useState(false);
  const callback = useRef(onReveal);
  callback.current = onReveal;

  useEffect(()=>{
    if(!sound) {scratchSound.current?.dispose();scratchSound.current=null;}
    else if(drawing.current && !scratchSound.current) scratchSound.current=createScratchSound();
    return ()=>{scratchSound.current?.dispose();scratchSound.current=null;};
  },[sound]);

  useEffect(()=>{
    const blur=()=>endStroke();
    const visibility=()=>{if(document.hidden)endStroke();};
    window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
    return ()=>{window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);haptics.stopScratch();};
  },[haptics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const width = 720, height = 430;
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#c0c5ab'); gradient.addColorStop(0.3, '#e1e3cd'); gradient.addColorStop(0.55, '#bcc3a5'); gradient.addColorStop(1, '#e0e1c9');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(68,75,50,.09)'; ctx.lineWidth = 1;
    for (let x = -height; x < width; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height, height); ctx.stroke(); }
    ctx.fillStyle = '#444b32'; ctx.textAlign = 'center';
    ctx.font = 'italic 58px Georgia'; ctx.fillText('Un poco de suerte.', width / 2, 212);
    ctx.font = '14px sans-serif'; ctx.letterSpacing = '3px'; ctx.fillText('RASPA. SONRÍE. DISFRUTA.', width / 2, 253);
    ctx.beginPath(); ctx.arc(width / 2, 116, 24, 0, Math.PI * 2); ctx.strokeStyle = '#646c4e'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(351, 116); ctx.lineTo(369, 116); ctx.moveTo(360, 107); ctx.lineTo(360, 125); ctx.stroke();
    setReady(true);
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true; endStroke();
    setProgress(100); callback.current();
  };
  function pauseStroke() {scratchSound.current?.stop();haptics.stopScratch();previous.current=null;}
  function endStroke(e) {
    if(e && e.pointerId!==activePointer.current) return;
    const pointer=activePointer.current;
    activePointer.current=null;drawing.current=false;pauseStroke();setTouching(false);
    const canvas=canvasRef.current;
    if(pointer!==null && canvas?.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  }
  function erase(e) {
    if (!drawing.current || finished.current || e.pointerId!==activePointer.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) {pauseStroke();return;}
    const x = (e.clientX - rect.left) / rect.width * canvas.width;
    const y = (e.clientY - rect.top) / rect.height * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 58; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const last=previous.current;
    const from = last || { x, y };
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 29, 0, Math.PI * 2); ctx.fill();
    // Track actual erased coverage on a grid; pointer distance alone can be gamed
    // by scratching the same line repeatedly and is inaccurate on touchscreens.
    const cellsBefore=progressCells.current.size;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 12));
    for (let step = 0; step <= steps; step++) {
      const px = from.x + (x - from.x) * step / steps, py = from.y + (y - from.y) * step / steps;
      for (let gx = Math.floor((px - 29) / 18); gx <= Math.ceil((px + 29) / 18); gx++) {
        for (let gy = Math.floor((py - 29) / 18); gy <= Math.ceil((py + 29) / 18); gy++) {
          if (gx >= 0 && gx < 40 && gy >= 0 && gy < 24 && Math.hypot(gx * 18 + 9 - px, gy * 18 + 9 - py) <= 29) progressCells.current.add(`${gx}:${gy}`);
        }
      }
    }
    const percent = Math.min(100, Math.round(progressCells.current.size / 960 / 0.43 * 100));
    if(last) {
      const distance=Math.hypot(e.clientX-last.clientX,e.clientY-last.clientY);
      if(distance>=.45) {
        const speed=distance/Math.max(4,Math.min(50,e.timeStamp-last.time))*1000;
        scratchSound.current?.move({
          speed,
          pan:((e.clientX-rect.left)/rect.width-.5)*.9,
          pressure:e.pressure || .5,
          freshness:Math.min(1,(progressCells.current.size-cellsBefore)/Math.max(1,steps*4)),
        });
        haptics.scratch({distance,speed,pointerType:e.pointerType});
      }
    }
    setProgress(percent); previous.current = { x, y, clientX:e.clientX,clientY:e.clientY,time:e.timeStamp };
    if (percent >= 100) finish();
  }
  return <div className="scratch-area-wrap">
    <div className={`scratch-area ${touching ? 'is-scratching' : ''}`}>
      <div className="scratch-under" aria-hidden="true"><Coffee size={46} strokeWidth={1}/><span>Un momento para ti.</span><p>{pending ? 'Descubriendo tu tarjeta…' : 'La suerte está por descubrirse'}</p></div>
      <motion.canvas ref={canvasRef} className="scratch-canvas" aria-label="Área para raspar con el dedo o el mouse. También puedes usar el botón Descubrir sin raspar."
        animate={{ opacity: progress === 100 ? 0 : 1 }} transition={{ duration: 0.25 }}
        onPointerDown={e => { if (!ready || finished.current || activePointer.current!==null || e.isPrimary===false || e.button>0) return; const canPlay=onScratchStart?.() ?? sound;scratchSound.current?.dispose();scratchSound.current=canPlay?createScratchSound():null; activePointer.current=e.pointerId;drawing.current = true; setTouching(true); previous.current = null; e.currentTarget.setPointerCapture(e.pointerId); erase(e); }}
        onTouchStart={()=>{if(ready && !finished.current) onScratchStart?.();}}
        onPointerMove={erase} onPointerUp={endStroke} onPointerCancel={endStroke} onLostPointerCapture={endStroke} onPointerLeave={pauseStroke}/>
    </div>
    <div className="scratch-progress"><div className="progress-track"><motion.div animate={{ transform: `scaleX(${progress / 100})` }} transition={{ duration: 0.15 }}/></div><span>{progress}%</span></div>
    <div className="scratch-helper"><span><Fingerprint size={17}/> Tu dedo es la moneda.</span><button className="text-button" disabled={pending} onClick={finish}>{pending ? 'Descubriendo…' : 'Descubrir sin raspar'} <ArrowUpRight size={14}/></button></div>
  </div>;
}

function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <motion.i key={i} initial={{ opacity: 1, transform: 'translate(0,0) rotate(0deg)' }} animate={{ opacity: [1, 1, 0], transform: `translate(${Math.sin(i * 2.4) * (130 + i * 5)}px, ${-90 + Math.cos(i * 1.6) * 220}px) rotate(${i * 47}deg)` }} transition={{ duration: 1.5, ease: 'easeOut', delay: i % 5 * 0.02 }} style={{ backgroundColor: ['#747b4e', '#b89b68', '#c8ccab', '#4a5238'][i % 4] }}/>)}</div>;
}

async function savePass(play) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.fillStyle = '#f6f4ed'; ctx.fillRect(0, 0, 1080, 1440);
  ctx.fillStyle = '#444b32'; ctx.fillRect(64, 64, 952, 1312);
  ctx.fillStyle = '#f6f4ed'; ctx.textAlign = 'center';
  ctx.font = '90px Georgia'; ctx.fillText('anvid coffe', 540, 200);
  ctx.font = '24px sans-serif'; ctx.fillText('UN PEQUEÑO GOLPE DE SUERTE', 540, 265);
  ctx.font = 'italic 86px Georgia'; ctx.fillText('Un café para ti.', 540, 405);
  ctx.font = '25px sans-serif'; ctx.fillText('CUPÓN DE UN SOLO USO', 540, 465);
  const qr=document.createElement('canvas');
  await QRCode.toCanvas(qr,`ANVID:${play.code}`,{width:300,margin:4,errorCorrectionLevel:'M',color:{dark:'#26301f',light:'#f6f4ed'}});
  ctx.drawImage(qr,390,510,300,300);
  ctx.font = 'bold 46px monospace'; ctx.fillText(play.code, 540, 895);
  const timestamp=formatPrizeTimestamp(play.wonAt);
  ctx.font = '30px sans-serif'; ctx.fillText(timestamp ? `Ganado el ${timestamp.date}` : 'Fecha no registrada',540,970);
  if(timestamp) {ctx.font='28px sans-serif';ctx.fillText(`${timestamp.time} · ${timestamp.zone}`,540,1023);}
  ctx.font = '25px sans-serif'; ctx.fillText(play.redeemedAt?'Cupón ya canjeado.':'Muéstralo al equipo para validar y entregar tu café.', 540, 1120);
  ctx.font = 'italic 36px Georgia'; ctx.fillText('La suerte también se toma.', 540, 1240);
  return new Promise(resolve=>canvas.toBlob(blob => { if (!blob) return resolve(false); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `mi-cupon-${play.code}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);resolve(true); }));
}

function ReviewForm({ onDone, saved, onSaved, compact = false, doneLabel = 'Volver a la experiencia' }) {
  const [rating, setRating] = useState(saved?.rating || 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(saved?.comment || '');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [attributes, setAttributes] = useState([]);
  const labels = ['No fue para mí', 'Podría mejorar', 'Estuvo bien', 'Me gustó mucho', 'Me encantó'];
  async function submit(e) {
    e.preventDefault();
    if (submitting.current) return;
    if (!rating) { setError('Selecciona una calificación para tu café.'); return; }
    submitting.current = true; setPending(true); setError('');
    try { const {review} = await submitCoffeeReview(rating, comment); onSaved?.(review); setSubmitted(true); }
    catch (error) { setError(error.message); }
    finally { submitting.current = false; setPending(false); }
  }
  if (submitted) return <motion.div className="review-thanks" initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }}><span className="success-icon"><Heart size={28} strokeWidth={1}/></span><h3>Tu opinión es parte<br/><em>del próximo café.</em></h3><p>Gracias por contarnos cómo estuvo. Tu reseña ya está guardada y puede ayudar a otros a elegir su próximo café.</p>{cafe.googleReviewUrl && <a className="action" href={cafe.googleReviewUrl} target="_blank" rel="noreferrer"><span>Compartir mi opinión en Google</span><ExternalLink size={18}/></a>}{onDone && <button className="text-button" onClick={onDone}>{doneLabel} <ArrowRight size={15}/></button>}</motion.div>;
  return <form onSubmit={submit} className={`review-form ${compact ? 'review-compact' : ''}`}>
    <fieldset disabled={pending}><legend>¿Qué tal estuvo tu café?</legend><div className="rating-stars" onMouseLeave={() => setHovered(0)}>{[1, 2, 3, 4, 5].map(n => <label key={n} onMouseEnter={() => setHovered(n)} className={n <= (hovered || rating) ? 'star-active' : ''}><input type="radio" name="coffee-rating" value={n} checked={rating === n} onChange={() => { setRating(n); setError(''); }} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${labels[n - 1]}`}/><Star size={32} strokeWidth={1.3}/></label>)}</div><span className="rating-label" aria-live="polite">{hovered || rating ? labels[(hovered || rating) - 1] : 'Tu experiencia, con toda honestidad.'}</span></fieldset>
    {!compact && <fieldset className="attributes"><legend>¿Qué te dejó una buena impresión? <span>Opcional</span></legend><div>{['El sabor', 'El aroma', 'La preparación', 'La atención'].map(attribute => <button type="button" key={attribute} aria-pressed={attributes.includes(attribute)} className={attributes.includes(attribute) ? 'selected' : ''} onClick={() => setAttributes(old => old.includes(attribute) ? old.filter(a => a !== attribute) : [...old, attribute])}>{attribute}{attributes.includes(attribute) && <Check size={13}/>}</button>)}</div></fieldset>}
    <label className="comment-label" htmlFor={compact ? 'coffee-comment-modal' : 'coffee-comment'}>Cuéntanos un poquito más <span>Opcional</span></label>
    <textarea disabled={pending} id={compact ? 'coffee-comment-modal' : 'coffee-comment'} placeholder="Ese primer sorbo, el aroma, algo que podríamos mejorar…" value={comment} onChange={e => setComment(e.target.value)} maxLength={600} rows={3}/>
    <div className="review-form-bottom"><p>Tu calificación y comentario serán públicos. La reseña es voluntaria y no influye en los premios.{saved && <span> Puedes actualizar tu opinión anterior.</span>}</p><Action type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Enviar mi opinión'}</Action></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [welcomeLanded,setWelcomeLanded]=useState(false);
  const sceneCupRef=useRef(null);
  const [play, setPlay] = useState({revealed: false, code: 'today'});
  const [mode, setMode] = useState('scratch');
  const [connection, setConnection] = useState('loading');
  const [connectionError, setConnectionError] = useState('');
  const [ownReview, setOwnReview] = useState(null);
  const [nextResetAt, setNextResetAt] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState('');
  const revealPending = useRef(false);
  const [sound, setSound] = useState(()=>readSaved().soundMuted!==true);
  const soundAllowed=useRef(sound);
  const [vibration, setVibration] = useState(()=>readSaved().vibrationEnabled ?? !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const haptics=useRef(null);
  if (!haptics.current) haptics.current=createExperienceHaptics({enabled:vibration});
  const [savedPass, setSavedPass] = useState(false);
  const [downloading,setDownloading]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  const [reviewOrigin, setReviewOrigin] = useState('result');
  const [winCelebration, setWinCelebration] = useState(0);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const reduce = useReducedMotion();
  const titleRef = useRef(null);
  const welcomePreviouslyOpen=useRef(showWelcome);
  const firstRender = useRef(true);
  const step = mode === 'reviews' ? (play.revealed ? 1 : 0) : mode === 'scratch' ? 0 : mode === 'result' ? 1 : 2;

  async function restoreState(initial = false) {
    if(initial) {setConnection('loading');setConnectionError('');}
    try {
      const state = await (initial ? ensureCoffeeSession() : loadCoffeeState());
      setPlay(state.coupon || {revealed:false,code:state.day}); setOwnReview(state.review); setNextResetAt(state.nextResetAt);setConnection('ready');
      setMode(current => ['scratch','result'].includes(current) ? (state.coupon ? 'result' : 'scratch') : current);
    } catch(error) {setConnectionError(error.message); if(initial) setConnection('error');}
  }
  useEffect(()=>{restoreState(true);},[]);
  useEffect(()=>{
    if(!nextResetAt) return;
    const due = () => {if(Date.now() >= Date.parse(nextResetAt) && !revealPending.current) restoreState();};
    const timer = setTimeout(due,Math.max(500,Date.parse(nextResetAt)-Date.now()+1000));
    document.addEventListener('visibilitychange',due);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',due);};
  },[nextResetAt]);

  useEffect(()=>{
    const wasOpen=welcomePreviouslyOpen.current;
    welcomePreviouslyOpen.current=showWelcome;
    if(wasOpen && !showWelcome && !document.hidden) titleRef.current?.focus({preventScroll:true});
  },[showWelcome]);

  useEffect(()=>{
    const stop=()=>haptics.current.stop();
    const visibility=()=>{if(document.hidden)stop();};
    const resume=()=>haptics.current.resumePendingWin();
    window.addEventListener('blur',stop);window.addEventListener('pointerup',resume);document.addEventListener('visibilitychange',visibility);
    return ()=>{stop();window.removeEventListener('blur',stop);window.removeEventListener('pointerup',resume);document.removeEventListener('visibilitychange',visibility);};
  },[]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    // Move focus to the newly revealed step after its short presence transition.
    const timer = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), reduce ? 0 : 250);
    return () => clearTimeout(timer);
  }, [mode, reduce]);

  async function reveal() {
    if(revealPending.current || play.revealed) return;
    prepareInteractionSound();revealPending.current=true;setRevealing(true);setRevealError('');
    try {
      const outcome = await revealCoffee();const next=outcome.coupon;
      setPlay(next);setNextResetAt(outcome.nextResetAt);setSavedPass(false);
      if(next.won && outcome.isNew) {haptics.current.win({reducedMotion:!!reduce});setWinCelebration(previous=>previous+1);setShowWinCelebration(true);}
      if(soundAllowed.current && !next.won) playResultTone(false);
      setMode('result');
    } catch(error) {setRevealError(error.message);}
    finally {revealPending.current=false;setRevealing(false);}
  }
  function prepareInteractionSound() {
    if(!soundAllowed.current) return false;
    // Unlock inside the trusted gesture, before the first pointer move arrives.
    setExperienceSound(true);
    return true;
  }
  function openReview(origin) { prepareInteractionSound(); setReviewOrigin(origin); setMode(origin === 'result' && play.revealed && !play.won ? 'paper-toss' : 'review'); }
  function toggleSound() {const next=!soundAllowed.current;soundAllowed.current=next;setExperienceSound(next);setSound(next);saveLocal({soundMuted:!next});}
  function toggleVibration() {const next=!vibration;haptics.current.setEnabled(next);setVibration(next);saveLocal({vibrationEnabled:next});}
  const enter = { opacity: 0, transform: reduce ? 'none' : 'translateY(12px)' };
  const visible = { opacity: 1, transform: 'translateY(0px)' };

  return <MotionConfig reducedMotion="user"><div className="game-shell" id="inicio" data-celebrating={showWinCelebration?'true':'false'} data-welcome-stage={showWelcome?(welcomeLanded?'landing':'intro'):'complete'}>
    <div className="game-backdrop" aria-hidden="true"><FluidBackdrop paused={showWinCelebration}/><img src="/images/anvid-scene.webp" alt="" fetchPriority="high"/><div className="ambient-light"><i/><i/><i/></div><span className="backdrop-wordmark">ANVID</span><CoffeeObjects anchorRef={sceneCupRef} celebration={winCelebration} won={play.revealed && play.won}/><div className="coffee-vignette"/><div className="film-grain"/></div>
    <header className="game-header"><Logo light/><div className="experience-controls">{haptics.current.supported && <button className="sound-control haptic-control" onClick={toggleVibration} aria-label={vibration ? 'Desactivar vibración' : 'Activar vibración'} aria-pressed={vibration} title="Vibración en celulares compatibles">{vibration ? <Vibrate size={18} strokeWidth={1.5}/> : <VibrateOff size={18} strokeWidth={1.5}/>}<span>Vibración {vibration ? 'activada' : 'desactivada'}</span></button>}<button className="sound-control" onClick={toggleSound} aria-label={sound ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={sound}>{sound ? <Volume2 size={18} strokeWidth={1.5}/> : <VolumeX size={18} strokeWidth={1.5}/>}<span>Sonido {sound ? 'activado' : 'desactivado'}</span></button></div></header>
    <main className="game-main">
      <motion.div layout className="single-game-card" initial={enter} animate={visible} transition={{ duration: 0.6, ease, layout: { duration: .25, ease } }}>
        <LiquidGlass/>
        <ol className="game-steps" aria-label="Tu experiencia">{['Raspa', 'Descubre', 'Opina'].map((label, i) => <li key={label} className={i === step ? 'current' : i < step ? 'complete' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Check size={11}/> : `0${i + 1}`}</span>{label}</li>)}</ol>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'scratch' && connection !== 'ready' && <motion.section key="connection" initial={enter} animate={visible} exit={{opacity:0}} className="game-face connection-face" aria-busy={connection === 'loading'}><Coffee size={30} strokeWidth={1}/><h1 ref={titleRef} tabIndex={-1}>Tu pausa<br/><em>empieza aquí.</em></h1><p className="screen-description" role="status">{connection === 'loading' ? 'Preparando tu tarjeta de hoy…' : connectionError}</p>{connection === 'error' && <Action onClick={()=>restoreState(true)}>Volver a intentar</Action>}</motion.section>}
          {mode === 'scratch' && connection === 'ready' && <motion.section key={`scratch-${play.code}`} initial={enter} animate={visible} exit={{ opacity: 0, transform: reduce ? 'none' : 'translateY(-8px)' }} transition={{ duration: 0.2, ease }} className="game-face">
            <h1 ref={titleRef} tabIndex={-1}>¿Y si hoy<br/><em>te toca a ti?</em></h1>
            <p className="screen-description">Raspa la tarjeta. Tu próximo café<br/>podría ir por nuestra cuenta.</p>
            <div className="standalone-ticket" aria-busy={revealing}><ScratchSurface key={play.code} pending={revealing} sound={sound} haptics={haptics.current} onScratchStart={prepareInteractionSound} onReveal={reveal}/></div>
            <p className="daily-prize-note">Una tarjeta diaria por navegador · reinicio a medianoche (UTC−6).</p>
            {revealError && <div className="api-inline-error" role="alert"><p>{revealError}</p><button className="text-button" onClick={reveal}>Reintentar mi resultado <ArrowRight size={14}/></button></div>}
            <div className="game-face-signature"><Coffee size={15} strokeWidth={1.2}/><span>UN PEQUEÑO RITUAL DE ANVID COFFE</span></div>
          </motion.section>}
          {mode === 'result' && <motion.section key="result" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face result-face">
            {play.won && <Confetti/>}
            {play.won ? <><h1 ref={titleRef} tabIndex={-1}>Hoy invita<br/><em>la suerte.</em></h1><p className="screen-description">¡Ganaste un café de cortesía!<br/>Guarda este pequeño golpe de suerte.</p></> : <div className="loss-coupon"><span className="loss-coupon-brand">anvid <small>coffe</small></span><h1 ref={titleRef} tabIndex={-1}>Hoy no tocó.<br/><em>Lo bonito sigue.</em></h1><p>Esta tarjeta no tenía premio.<br/>Ojalá este café te regale una pausa bonita.<br/>Que hoy encuentres una razón para sonreír.</p><span className="loss-coupon-bottom">UN MOMENTO BONITO TAMBIÉN CUENTA.</span></div>}
            {play.won && <div className="mini-prize"><div><Coffee size={23} strokeWidth={1.1}/><span>Un café para ti.<small>CUPÓN DE CAFÉ · ANVID COFFE</small></span></div><span className="mini-prize-code">{play.code}</span><PrizeTimestamp value={play.wonAt}/><CouponQr play={play}/><button className="text-button" disabled={downloading} onClick={async()=>{if(downloading)return;setDownloading(true);setDownloadError('');try{if(!await savePass(play))throw new Error();setSavedPass(true);}catch{setDownloadError('No pudimos descargarlo. Puedes mostrar el QR en esta pantalla.');}finally{setDownloading(false);}}}>{savedPass ? <Check size={14}/> : <Download size={14}/>} {downloading?'Preparando cupón…':savedPass ? 'Cupón guardado · descargar otra vez' : 'Guardar mi cupón'}</button>{downloadError&&<p role="alert" className="form-error">{downloadError}</p>}</div>}
            <div className="result-review-prompt"><Action onClick={() => openReview('result')}>Dejar una reseña de mi café</Action></div>
            <span className="result-footnote">Tu opinión es sobre el café que probaste.</span>
          </motion.section>}
          {mode === 'paper-toss' && <motion.section key="paper-toss" initial={enter} animate={visible} exit={{opacity:0}} transition={{duration:.2,ease}} className="game-face paper-toss-face"><PaperToss titleRef={titleRef} sound={sound} onComplete={() => setMode('review')}/></motion.section>}
          {mode === 'review' && <motion.section key="review" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face coffee-review-face">
            <button className="back-to-result" onClick={() => setMode(reviewOrigin)}><ArrowRight size={14}/> {reviewOrigin === 'reviews' ? 'Reseñas del café' : 'Mi resultado'}</button>
            <h1 ref={titleRef} tabIndex={-1}>Hablemos de<br/><em>tu café.</em></h1>
            <p className="screen-description">Ese primer sorbo. El aroma. El sabor.<br/>Nos encantaría saber qué te pareció.</p>
            <ReviewForm compact saved={ownReview} onSaved={setOwnReview} onDone={() => setMode('reviews')} doneLabel="Ver reseñas del café"/>
          </motion.section>}
          {mode === 'reviews' && <motion.section key="reviews" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face reviews-face"><CafeReviews titleRef={titleRef} onBack={() => setMode(play.revealed ? 'result' : 'scratch')} onWrite={() => openReview('reviews')}/></motion.section>}
        </AnimatePresence>
        <div className="card-bottom-mark">{mode !== 'reviews' ? <button className="view-reviews-link" onClick={() => setMode('reviews')}><Star size={11} strokeWidth={1.2}/> Ver reseñas del café <ArrowUpRight size={11}/></button> : <span>OPINIONES DEL CAFÉ</span>}<Flower/><span>COFFEE. LUCK. REPEAT.</span></div>
      </motion.div>
    </main>
    <footer className="game-footer" aria-hidden="true"/>
    {showWinCelebration && <WinCelebration resultTitleRef={titleRef} wonAt={play.wonAt} sound={sound} onToggleSound={toggleSound} onClose={() => {haptics.current.stop();setShowWinCelebration(false);}}/>}
    {showWelcome && <CoffeeWelcome sceneCupRef={sceneCupRef} onLanding={()=>setWelcomeLanded(true)} sound={sound} onToggleSound={toggleSound} onPrepareSound={prepareInteractionSound} onComplete={()=>{setShowWelcome(false);setWelcomeLanded(false);}}/>}
  </div></MotionConfig>;
}



