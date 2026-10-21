import { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';

const beans = [
  [14,18,33,19,-4,-28], [28,37,47,23,-12,47], [43,17,29,17,-8,85],
  [56,35,55,21,-14,-52], [73,18,36,18,-6,38], [86,48,57,25,-15,72],
  [19,75,44,22,-18,-46], [36,65,62,26,-10,19], [53,78,35,19,-5,115],
  [66,61,47,23,-20,-28], [81,80,38,17,-11,62], [48,47,43,24,-15,-74],
];

export default function CoffeeObjects({ celebration, won, anchorRef }) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const hasPrizePose = won && celebration > 0 && !reduce;

  useEffect(() => {
    let active = true;
    if (reduce) { controls.set({ transform: 'translateY(0px) rotate(0deg) scale(1)' }); return; }
    if (won && celebration > 0) {
      // A rare success moment: spin and shrink first, then hand the landing to
      // a spring. Stop the previous sequence when the visitor starts a new card.
      void (async () => {
        await controls.start({ transform: 'translateY(-95px) rotate(360deg) scale(.6)', transition: { duration: .85, ease: [.23, 1, .32, 1] } });
        if (!active) return;
        await controls.start({ transform: 'translateY(16px) rotate(360deg) scale(.76)', transition: { type: 'spring', duration: .8, bounce: .3 } });
      })();
    } else {
      void controls.start({ transform: 'translateY(0px) rotate(0deg) scale(1)', transition: { type: 'spring', duration: .5, bounce: .2 } });
    }
    return () => { active = false; controls.stop(); };
  }, [celebration, won, reduce, controls]);

  return <div className={`coffee-objects ${won ? 'coffee-objects-won' : ''} ${hasPrizePose ? 'coffee-objects-celebrated' : ''}`} aria-hidden="true">
    <div ref={anchorRef} className="cup-anchor"><div className="cup-float"><motion.img className="animated-coffee-cup" src="/images/anvid-cup.webp" alt="" animate={controls} draggable="false"/></div></div>
    <div className="floating-beans">{beans.map(([x,y,size,duration,delay,rotation],i) => <div className={`bean-flight bean-flight-${i % 3}`} key={i} style={{left:`${x}%`,top:`${y}%`,width:`${size}px`,animationDuration:`${duration}s`,animationDelay:`${delay}s`}}><img src="/images/coffee-bean.webp" alt="" draggable="false" style={{transform:`rotate(${rotation}deg)`}}/></div>)}</div>
  </div>;
}
