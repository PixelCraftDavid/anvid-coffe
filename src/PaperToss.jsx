import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import CrumplingCoupon from './CrumplingCoupon';

const DURATION = 4300;

function Wastebasket({ front = false }) {
  return <svg viewBox="0 0 108 132" fill="none" aria-hidden="true">
    <defs><linearGradient id={front?'bin-front-metal':'bin-back-metal'} x1="14" x2="100" y1="28" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#e9efd9" stopOpacity=".35"/><stop offset=".45" stopColor="#b2c49b" stopOpacity=".06"/><stop offset="1" stopColor="#e3eccd" stopOpacity=".25"/></linearGradient></defs>
    {front ? <>
      <path d="m15 28 12 89c1 16 53 16 55 0l12-89" fill="url(#bin-front-metal)" stroke="#d8e7bc" strokeWidth="1.2"/>
      <path d="m25 34 11 84m5-80 5 84m22-84-6 84m22-88-13 84M22 57c17 12 48 12 65 0M25 83c15 10 42 10 59 0M29 107c13 8 34 8 51 0" stroke="#d2dfb9" strokeOpacity=".6" strokeWidth=".8"/>
      <path d="M15 28c0 16 78 16 78 0" stroke="#e6edd4" strokeWidth="2.5"/>
      <path d="M20 29c2 11 65 11 68 0M31 119c11 9 34 10 47 0" stroke="#f5f6e3" strokeOpacity=".55" strokeWidth=".8"/>
    </> : <>
      <ellipse cx="54" cy="28" rx="39" ry="12" fill="#152410" stroke="#9aae87" strokeWidth="2"/>
      <ellipse cx="54" cy="28" rx="34" ry="8" fill="#0c170b" stroke="#e3eccd" strokeOpacity=".55" strokeWidth=".7"/>
      <path d="M17 25c13-13 61-13 74 0" stroke="#f0f4e1" strokeOpacity=".8" strokeWidth="1.2"/>
    </>}
  </svg>;
}

function createBallFrames(targetX, mouthY) {
  const frames=[];
  const pose=(time,x,y,rotation,sx,sy,opacity=1)=>frames.push({offset:time/DURATION,transform:`translate3d(${x-38}px, ${y-38}px, 0px) rotate(${rotation}deg) scale(${sx}, ${sy})`,opacity});
  pose(0,0,95,-12,.75,.75,0);
  pose(1250,0,95,-12,.75,.75,0);
  pose(1580,0,95,12,.84,.84);
  pose(1700,0,95,12,.84,.84);
  const rimX=targetX-28,rimY=mouthY-27;
  // Sample a ballistic arc; the browser composites the full transform.
  for(let i=1;i<=40;i++) {
    const t=i/40;
    pose(1700+t*1100,rimX*t,95+(rimY-95)*t-380*t*(1-t),12+t*308,.84-.12*t,.84-.12*t);
  }
  pose(2880,rimX,rimY+4.5,325,.82,.60);
  // The rim redirects the compressed ball up and towards the opening.
  for(let i=1;i<=28;i++) {
    const t=i/28,stretch=Math.sin(Math.PI*t);
    pose(2880+t*620,rimX+(targetX+3-rimX)*t,rimY+t-168*t*(1-t),325+85*t,.72-.05*stretch,.72+.04*stretch);
  }
  for(let i=1;i<=20;i++) {
    const t=i/20;
    pose(3500+t*420,targetX+3-t,mouthY-26+73*t*t,410+70*t,.72-.16*t,.72-.16*t);
  }
  pose(4060,targetX+2,mouthY+47,480,.56,.56,.8);
  pose(4200,targetX+2,mouthY+47,480,.56,.56,0);
  pose(DURATION,targetX+2,mouthY+47,480,.56,.56,0);
  return frames;
}

export default function PaperToss({ onComplete, titleRef }) {
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const ballRef = useRef(null);
  const basketBackRef = useRef(null);
  const basketFrontRef = useRef(null);
  const done = useRef(onComplete); done.current = onComplete;

  useEffect(() => {
    if (reduce) { done.current(); return; }
    const stage=stageRef.current.getBoundingClientRect();
    const basket=basketBackRef.current.getBoundingClientRect();
    const targetX=basket.x+basket.width/2-stage.x-stage.width/2;
    const mouthY=basket.y-stage.y+basket.height*(28/132);
    const animations=[ballRef.current.animate(createBallFrames(targetX,mouthY),{duration:DURATION,easing:'linear',fill:'both'})];
    const wobble=[
      {transform:'translateX(-50%) rotate(0deg)',offset:0},
      {transform:'translateX(-50%) rotate(-3deg)',offset:.2},
      {transform:'translateX(-50%) rotate(2deg)',offset:.55},
      {transform:'translateX(-50%) rotate(0deg)',offset:1},
    ];
    for(const element of [basketBackRef.current,basketFrontRef.current]) {
      animations.push(element.animate(wobble,{duration:500,delay:2790,easing:'cubic-bezier(.23,1,.32,1)',fill:'both'}));
    }
    const timer=setTimeout(()=>done.current(),DURATION);
    return ()=>{clearTimeout(timer);animations.forEach(animation=>animation.cancel());};
  }, [reduce]);

  return <>
    <h1 ref={titleRef} tabIndex={-1}>Hagamos espacio<br/><em>para tu opinión.</em></h1>
    <div className="paper-toss-stage" ref={stageRef} aria-hidden="true">
      <CrumplingCoupon/>
      <div className="toss-wastebasket basket-back" ref={basketBackRef}><Wastebasket/></div>
      <img ref={ballRef} src="/images/paper-ball.webp" alt="" className="toss-paper-ball"/>
      <div className="toss-wastebasket basket-front" ref={basketFrontRef}><Wastebasket front/></div>
      <span className="toss-ground"/>
    </div>
    <p className="paper-toss-caption">Tu opinión se queda con nosotros.</p>
    <button className="text-button skip-paper-toss" onClick={onComplete}>Saltar animación y escribir <ArrowRight size={13}/></button>
  </>;
}
