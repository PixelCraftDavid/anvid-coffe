import React, { useEffect, useRef, useState } from 'react';

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, Coffee, Fingerprint, Check, Star, Download, RotateCcw, Volume2, VolumeX, Heart, ExternalLink } from 'lucide-react';
import { cafe, readSaved, saveLocal, createPreviewPlay } from './config';
import FluidBackdrop from './FluidBackdrop';
import CafeReviews from './CafeReviews';
import CoffeeObjects from './CoffeeObjects';


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

function useTone() {
  const context = useRef(null);
  return (won) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      context.current ||= new AudioCtx();
      const ctx = context.current;
      ctx.resume();
      (won ? [523.25, 659.25, 783.99, 1046.5] : [392, 523.25]).forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.5);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(ctx.currentTime + i * 0.1); oscillator.stop(ctx.currentTime + i * 0.1 + 0.6);
      });
    } catch { /* Optional audio never blocks play. */ }
  };
}

function ScratchSurface({ play, onReveal }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const previous = useRef(null);
  const progressCells = useRef(new Set());
  const finished = useRef(false);
  const [progress, setProgress] = useState(0);
  const [touching, setTouching] = useState(false);
  const [ready, setReady] = useState(false);
  const callback = useRef(onReveal);
  callback.current = onReveal;

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
    finished.current = true; drawing.current = false; setTouching(false);
    setProgress(100); callback.current();
  };
  function erase(e) {
    if (!drawing.current || finished.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * canvas.width;
    const y = (e.clientY - rect.top) / rect.height * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 58; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const from = previous.current || { x, y };
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 29, 0, Math.PI * 2); ctx.fill();
    // Track actual erased coverage on a grid; pointer distance alone can be gamed
    // by scratching the same line repeatedly and is inaccurate on touchscreens.
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
    setProgress(percent); previous.current = { x, y };
    if (percent >= 100) finish();
  }
  return <div className="scratch-area-wrap">
    <div className={`scratch-area ${touching ? 'is-scratching' : ''}`}>
      <div className="scratch-under" aria-hidden="true"><Coffee size={46} strokeWidth={1}/><span>{play.won ? 'Este café va por nosotros.' : 'El ritual continúa.'}</span><p>{play.won ? 'Un café de cortesía para ti' : 'Gracias por compartir este momento'}</p></div>
      <motion.canvas ref={canvasRef} className="scratch-canvas" aria-label="Área para raspar con el dedo o el mouse. También puedes usar el botón Descubrir sin raspar."
        animate={{ opacity: progress === 100 ? 0 : 1 }} transition={{ duration: 0.25 }}
        onPointerDown={e => { if (!ready) return; drawing.current = true; setTouching(true); previous.current = null; e.currentTarget.setPointerCapture(e.pointerId); erase(e); }}
        onPointerMove={erase} onPointerUp={() => { drawing.current = false; setTouching(false); previous.current = null; }}
        onPointerCancel={() => { drawing.current = false; setTouching(false); previous.current = null; }}/>
    </div>
    <div className="scratch-progress"><div className="progress-track"><motion.div animate={{ transform: `scaleX(${progress / 100})` }} transition={{ duration: 0.15 }}/></div><span>{progress}%</span></div>
    <div className="scratch-helper"><span><Fingerprint size={17}/> Tu dedo es la moneda.</span><button className="text-button" onClick={finish}>Descubrir sin raspar <ArrowUpRight size={14}/></button></div>
  </div>;
}

function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <motion.i key={i} initial={{ opacity: 1, transform: 'translate(0,0) rotate(0deg)' }} animate={{ opacity: [1, 1, 0], transform: `translate(${Math.sin(i * 2.4) * (130 + i * 5)}px, ${-90 + Math.cos(i * 1.6) * 220}px) rotate(${i * 47}deg)` }} transition={{ duration: 1.5, ease: 'easeOut', delay: i % 5 * 0.02 }} style={{ backgroundColor: ['#747b4e', '#b89b68', '#c8ccab', '#4a5238'][i % 4] }}/>)}</div>;
}

function savePass(play) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.fillStyle = '#f6f4ed'; ctx.fillRect(0, 0, 1080, 1440);
  ctx.fillStyle = '#444b32'; ctx.fillRect(64, 64, 952, 1312);
  ctx.fillStyle = '#f6f4ed'; ctx.textAlign = 'center';
  ctx.font = '90px Georgia'; ctx.fillText('anvid coffe', 540, 245);
  ctx.font = '24px sans-serif'; ctx.fillText('UN PEQUEÑO GOLPE DE SUERTE', 540, 315);
  ctx.font = 'italic 86px Georgia'; ctx.fillText('Un café para ti.', 540, 600);
  ctx.font = '30px sans-serif'; ctx.fillText('PASE DE DEMOSTRACIÓN', 540, 740);
  ctx.font = 'bold 46px monospace'; ctx.fillText(play.code, 540, 850);
  ctx.font = '26px sans-serif'; ctx.fillText('Sin valor de canje. Vista previa de la experiencia.', 540, 940);
  ctx.font = 'italic 36px Georgia'; ctx.fillText('La suerte también se toma.', 540, 1210);
  canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mi-pase-anvid-demo.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
}

function ReviewForm({ onDone, compact = false, doneLabel = 'Volver a la experiencia' }) {
  const saved = readSaved().review;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [attributes, setAttributes] = useState([]);
  const labels = ['No fue para mí', 'Podría mejorar', 'Estuvo bien', 'Me gustó mucho', 'Me encantó'];
  function submit(e) {
    e.preventDefault();
    if (!rating) { setError('Selecciona una calificación para tu café.'); return; }
    const review = { rating, comment: comment.trim(), attributes, createdAt: new Date().toISOString() };
    const ok = saveLocal({ review, reviews: [review] });
    if (!ok) { setError('No pudimos guardar en este navegador. Habilita el almacenamiento e inténtalo de nuevo.'); return; }
    setSubmitted(true);
  }
  if (submitted) return <motion.div className="review-thanks" initial={{ opacity: 0, transform: 'translateY(8px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }}><span className="success-icon"><Heart size={28} strokeWidth={1}/></span><h3>Tu opinión es parte<br/><em>del próximo café.</em></h3><p>Gracias por contarnos cómo estuvo. Esta reseña de prueba se guardó solo en tu navegador.</p>{cafe.googleReviewUrl && <a className="action" href={cafe.googleReviewUrl} target="_blank" rel="noreferrer"><span>Compartir mi opinión en Google</span><ExternalLink size={18}/></a>}{onDone && <button className="text-button" onClick={onDone}>{doneLabel} <ArrowRight size={15}/></button>}</motion.div>;
  return <form onSubmit={submit} className={`review-form ${compact ? 'review-compact' : ''}`}>
    <fieldset><legend>¿Qué tal estuvo tu café?</legend><div className="rating-stars" onMouseLeave={() => setHovered(0)}>{[1, 2, 3, 4, 5].map(n => <label key={n} onMouseEnter={() => setHovered(n)} className={n <= (hovered || rating) ? 'star-active' : ''}><input type="radio" name="coffee-rating" value={n} checked={rating === n} onChange={() => { setRating(n); setError(''); }} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${labels[n - 1]}`}/><Star size={32} strokeWidth={1.3}/></label>)}</div><span className="rating-label" aria-live="polite">{hovered || rating ? labels[(hovered || rating) - 1] : 'Tu experiencia, con toda honestidad.'}</span></fieldset>
    {!compact && <fieldset className="attributes"><legend>¿Qué te dejó una buena impresión? <span>Opcional</span></legend><div>{['El sabor', 'El aroma', 'La preparación', 'La atención'].map(attribute => <button type="button" key={attribute} aria-pressed={attributes.includes(attribute)} className={attributes.includes(attribute) ? 'selected' : ''} onClick={() => setAttributes(old => old.includes(attribute) ? old.filter(a => a !== attribute) : [...old, attribute])}>{attribute}{attributes.includes(attribute) && <Check size={13}/>}</button>)}</div></fieldset>}
    <label className="comment-label" htmlFor={compact ? 'coffee-comment-modal' : 'coffee-comment'}>Cuéntanos un poquito más <span>Opcional</span></label>
    <textarea id={compact ? 'coffee-comment-modal' : 'coffee-comment'} placeholder="Ese primer sorbo, el aroma, algo que podríamos mejorar…" value={comment} onChange={e => setComment(e.target.value)} maxLength={600} rows={3}/>
    <div className="review-form-bottom"><p>{cafe.demo ? 'Vista previa: tu opinión se guarda en este dispositivo.' : 'Tu reseña es voluntaria y no influye en los premios.'}{saved && <span> Puedes actualizar tu opinión anterior.</span>}</p><Action type="submit">Enviar mi opinión</Action></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}

export default function App() {
  const [play, setPlay] = useState(() => readSaved().play || createPreviewPlay());
  const [mode, setMode] = useState(() => readSaved().play?.revealed ? 'result' : 'scratch');
  const [sound, setSound] = useState(false);
  const [savedPass, setSavedPass] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewOrigin, setReviewOrigin] = useState('result');
  const [winCelebration, setWinCelebration] = useState(0);
  const reduce = useReducedMotion();
  const tone = useTone();
  const titleRef = useRef(null);
  const firstRender = useRef(true);
  const step = mode === 'reviews' ? (play.revealed ? 1 : 0) : mode === 'scratch' ? 0 : mode === 'result' ? 1 : 2;

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    // Move focus to the newly revealed step after its short presence transition.
    const timer = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), reduce ? 0 : 250);
    return () => clearTimeout(timer);
  }, [mode, reduce]);

  function reveal() {
    const next = { ...play, revealed: true }; setPlay(next); saveLocal({ play: next });
    if (next.won) setWinCelebration(previous => previous + 1);
    if (sound) tone(next.won);
    setMode('result');
  }
  function restart(won) {
    setPlay(createPreviewPlay(won)); setMode('scratch'); setSavedPass(false); setMessage('');
  }
  function openReview(origin) { setReviewOrigin(origin); setMode('review'); }
  const enter = { opacity: 0, transform: reduce ? 'none' : 'translateY(12px)' };
  const visible = { opacity: 1, transform: 'translateY(0px)' };

  return <MotionConfig reducedMotion="user"><div className="game-shell" id="inicio">
    <div className="game-backdrop" aria-hidden="true"><FluidBackdrop/><img src="/images/anvid-scene.webp" alt="" fetchPriority="high"/><CoffeeObjects celebration={winCelebration} won={play.revealed && play.won}/><div className="ambient-light"><i/><i/><i/></div><div className="coffee-vignette"/><div className="film-grain"/></div>
    <header className="game-header"><Logo light/><button className="sound-control" onClick={() => setSound(v => !v)} aria-label={sound ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={sound}>{sound ? <Volume2 size={18} strokeWidth={1.5}/> : <VolumeX size={18} strokeWidth={1.5}/>}<span>Sonido {sound ? 'activado' : 'desactivado'}</span></button></header>
    <main className="game-main">
      <motion.div layout className="single-game-card" initial={enter} animate={visible} transition={{ duration: 0.6, ease, layout: { duration: .25, ease } }}>
        <ol className="game-steps" aria-label="Tu experiencia">{['Raspa', 'Descubre', 'Opina'].map((label, i) => <li key={label} className={i === step ? 'current' : i < step ? 'complete' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Check size={11}/> : `0${i + 1}`}</span>{label}</li>)}</ol>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'scratch' && <motion.section key={`scratch-${play.code}`} initial={enter} animate={visible} exit={{ opacity: 0, transform: reduce ? 'none' : 'translateY(-8px)' }} transition={{ duration: 0.2, ease }} className="game-face">
            <h1 ref={titleRef} tabIndex={-1}>¿Y si hoy<br/><em>te toca a ti?</em></h1>
            <p className="screen-description">Raspa la tarjeta. Tu próximo café<br/>podría ir por nuestra cuenta.</p>
            <div className="standalone-ticket"><ScratchSurface key={play.code} play={play} onReveal={reveal}/></div>
            <div className="game-face-signature"><Coffee size={15} strokeWidth={1.2}/><span>UN PEQUEÑO RITUAL DE ANVID COFFE</span></div>
          </motion.section>}
          {mode === 'result' && <motion.section key="result" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face result-face">
            {play.won && <Confetti/>}
            <h1 ref={titleRef} tabIndex={-1}>{play.won ? <>Hoy invita<br/><em>la suerte.</em></> : <>Esta vez<br/><em>no tocó.</em></>}</h1>
            <p className="screen-description">{play.won ? '¡Ganaste un café de cortesía!' : 'Tu tarjeta no tenía premio esta vez.'}<br/>{play.won ? 'Guarda este pequeño golpe de suerte.' : 'Gracias por compartir este momento con Anvid.'}</p>
            {play.won && <div className="mini-prize"><div><Coffee size={23} strokeWidth={1.1}/><span>Un café para ti.<small>PASE DE DEMOSTRACIÓN · SIN VALOR DE CANJE</small></span></div><span className="mini-prize-code">{play.code}</span><button className="text-button" onClick={() => { savePass(play); setSavedPass(true); }}>{savedPass ? <Check size={14}/> : <Download size={14}/>} {savedPass ? 'Pase guardado · descargar otra vez' : 'Guardar mi pase'}</button></div>}
            <div className="result-review-prompt"><Action onClick={() => openReview('result')}>Dejar una reseña de mi café</Action></div>
            <span className="result-footnote">Tu opinión es sobre el café que probaste.</span>
          </motion.section>}
          {mode === 'review' && <motion.section key="review" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face coffee-review-face">
            <button className="back-to-result" onClick={() => setMode(reviewOrigin)}><ArrowRight size={14}/> {reviewOrigin === 'reviews' ? 'Reseñas del café' : 'Mi resultado'}</button>
            <h1 ref={titleRef} tabIndex={-1}>Hablemos de<br/><em>tu café.</em></h1>
            <p className="screen-description">Ese primer sorbo. El aroma. El sabor.<br/>Nos encantaría saber qué te pareció.</p>
            <ReviewForm compact onDone={() => setMode('reviews')} doneLabel="Ver reseñas del café"/>
          </motion.section>}
          {mode === 'reviews' && <motion.section key="reviews" initial={enter} animate={visible} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease }} className="game-face reviews-face"><CafeReviews titleRef={titleRef} onBack={() => setMode(play.revealed ? 'result' : 'scratch')} onWrite={() => openReview('reviews')}/></motion.section>}
        </AnimatePresence>
        <div className="card-bottom-mark">{mode !== 'reviews' ? <button className="view-reviews-link" onClick={() => setMode('reviews')}><Star size={11} strokeWidth={1.2}/> Ver reseñas del café <ArrowUpRight size={11}/></button> : <span>OPINIONES DEL CAFÉ</span>}<Flower/><span>COFFEE. LUCK. REPEAT.</span></div>
      </motion.div>
    </main>
    <footer className="game-footer"><span>Buen café. Pequeños rituales.</span><details className="preview-options"><summary>Modo demostración <span>+</span></summary><div><p>Premios de muestra, sin valor de canje.<br/>Las reseñas se guardan en este dispositivo.</p><button onClick={() => restart(true)}><RotateCcw size={13}/> Probar tarjeta con premio</button><button onClick={() => restart(false)}><RotateCcw size={13}/> Probar tarjeta sin premio</button><button onClick={() => { try { localStorage.removeItem(cafe.storageKey); setPlay(createPreviewPlay()); setMode('scratch'); setMessage('Tu reseña de prueba fue eliminada. Se creó una tarjeta nueva.'); } catch { setMessage('No se pudo acceder al almacenamiento.'); } }}>Borrar mi reseña de prueba</button>{message && <p role="status">{message}</p>}</div></details></footer>
  </div></MotionConfig>;
}



