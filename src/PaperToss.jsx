import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

function Wastebasket() {
  return <svg viewBox="0 0 108 132" fill="none" aria-hidden="true"><defs><linearGradient id="bin-metal" x1="14" x2="100" y1="28" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#d5dfbf" stopOpacity=".17"/><stop offset=".5" stopColor="#edf4dd" stopOpacity=".05"/><stop offset="1" stopColor="#97b179" stopOpacity=".2"/></linearGradient></defs><path d="m15 28 12 89c1 16 53 16 55 0l12-89" fill="url(#bin-metal)" stroke="#d8e7bc" strokeWidth="1.2"/><ellipse cx="54" cy="28" rx="39" ry="12" fill="#152410" stroke="#e3eccd" strokeWidth="1.5"/><ellipse cx="54" cy="28" rx="34" ry="8" stroke="#b9cd9a" strokeWidth=".7"/><path d="m25 34 11 84m5-80 5 84m22-84-6 84m22-88-13 84M22 57c17 12 48 12 65 0M25 83c15 10 42 10 59 0M29 107c13 8 34 8 51 0" stroke="#d2dfb9" strokeOpacity=".5" strokeWidth=".8"/><path d="M31 119c11 9 34 10 47 0" stroke="#e3eccd" strokeWidth="1.3"/></svg>;
}

export default function PaperToss({ onComplete, titleRef }) {
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const done = useRef(onComplete); done.current = onComplete;
  const [trajectory, setTrajectory] = useState({ x: 105, y: 125 });

  useEffect(() => {
    if (reduce) { done.current(); return; }
    const stage = stageRef.current;
    const bounds = stage.getBoundingClientRect();
    const basketHeight = window.matchMedia('(max-width:620px)').matches ? 98 : 106;
    setTrajectory({ x: Math.min(135, bounds.width * .29), y: bounds.height - 12 - basketHeight * .788 - 93.5 + 18 });
    const timer = setTimeout(() => done.current(), 2200);
    return () => clearTimeout(timer);
  }, [reduce]);

  return <>
    <h1 ref={titleRef} tabIndex={-1}>Hagamos espacio<br/><em>para tu opinión.</em></h1>
    <div className="paper-toss-stage" ref={stageRef} aria-hidden="true">
      <motion.div
        className="crumpling-coupon"
        initial={{transform:'translate(-50%, 0px) rotate(0deg) scale(1)',opacity:1,clipPath:'polygon(0% 0%,50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%)'}}
        animate={{transform:'translate(-50%, 25px) rotate(21deg) scale(.16)',opacity:[1,1,0],clipPath:'polygon(9% 14%,53% 0%,91% 21%,100% 54%,79% 100%,43% 85%,0% 75%,12% 46%)'}}
        transition={{duration:.65,ease:[.77,0,.175,1],opacity:{duration:.65,times:[0,.7,1]}}}
      ><span className="paper-coupon-brand">anvid <small>coffe</small></span><h2>Hoy no tocó.<br/><em>Lo bonito sigue.</em></h2><span className="paper-fold fold-one"/><span className="paper-fold fold-two"/></motion.div>
      <motion.img
        src="/images/paper-ball.webp" alt="" className="toss-paper-ball"
        initial={{opacity:0,x:-38.5,y:20,rotate:0,scale:.65}}
        animate={{opacity:[0,1,1,0],x:[-38.5,-38.5,trajectory.x*.55-38.5,trajectory.x-38.5],y:[20,20,-85,trajectory.y],rotate:[0,18,200,520],scale:[.65,1,.85,.36]}}
        transition={{duration:1.35,delay:.45,times:[0,.13,.5,1],ease:'linear',y:{duration:1.35,delay:.45,times:[0,.13,.5,1],ease:['easeOut','easeOut','easeIn']},opacity:{duration:1.35,delay:.45,times:[0,.13,.91,1]}}}
      />
      <motion.div className="toss-wastebasket" style={{left:`calc(50% + ${trajectory.x}px)`}} initial={{transform:'translateX(-50%) rotate(0deg)'}} animate={{transform:['translateX(-50%) rotate(0deg)','translateX(-50%) rotate(-5deg)','translateX(-50%) rotate(3deg)','translateX(-50%) rotate(0deg)']}} transition={{duration:.4,delay:1.65,ease:[.23,1,.32,1]}}><Wastebasket/></motion.div>
      <span className="toss-ground"/>
    </div>
    <p className="paper-toss-caption">Tu opinión se queda con nosotros.</p>
    <button className="text-button skip-paper-toss" onClick={onComplete}>Saltar animación y escribir <ArrowRight size={13}/></button>
  </>;
}
