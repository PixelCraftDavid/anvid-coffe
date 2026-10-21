import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react';
import WinCelebration from './WinCelebration.jsx';
import { setExperienceSound } from './experienceAudio.js';
import { readSaved } from './config.js';
import './styles.css';

// A separate entry point: never mounts App or imports the coupon/review API.
function CelebrationPreview() {
  const titleRef = useRef(null);
  const [open,setOpen] = useState(false);
  const [played,setPlayed] = useState(false);
  const [sound,setSound] = useState(()=>readSaved().soundMuted!==true);
  function toggleSound() {setSound(previous=>{setExperienceSound(!previous);return !previous;});}
  function start() {setExperienceSound(sound);setPlayed(true);setOpen(true);}
  return <MotionConfig reducedMotion="user"><main className="celebration-test-page">
    <div className="celebration-test-content">
      <a className="celebration-test-brand" href="/">anvid</a>
      <h1 ref={titleRef} tabIndex={-1}>Un poquito<br/><em>de celebración.</em></h1>
      <p>Prueba la animación del café tantas veces como quieras. No genera cupones ni consume el premio del día.</p>
      <button className="action" onClick={start}><span>{played?'Repetir prueba':'Probar animación'}</span><span className="action-arrow"><ArrowUpRight size={19}/></span></button>
      <button className="text-button celebration-test-sound" onClick={toggleSound} aria-pressed={sound}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>} Sonido {sound?'activado':'desactivado'}</button>
      <a className="text-button" href="/">Volver al café <ArrowUpRight size={14}/></a>
    </div>
    {open && <WinCelebration preview resultTitleRef={titleRef} sound={sound} onToggleSound={toggleSound} onClose={()=>setOpen(false)}/>}
  </main></MotionConfig>;
}

createRoot(document.getElementById('root')).render(<CelebrationPreview/>);
