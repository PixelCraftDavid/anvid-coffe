import { useLayoutEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { COFFEE_WELCOME as WELCOME } from './coffeeWelcomeTimeline.js';

const ease=[.77,0,.175,1];
const tea='M338 210 C367 210 423 210 452 210 L444 269 Q395 289 346 269 Z';
const takeaway='M335 219 C376 219 435 219 486 219 L467 292 Q409 310 350 292 Z';

export default function WelcomeCupTransfer({ geometry, landed }) {
  const frame=useRef(null);
  const {source,target,floatPose,cupPose,floatOrigin,cupOrigin}=geometry;
  useLayoutEffect(()=>{
    const from=`translate(${source.left-target.left}px, ${source.top-target.top}px) scale(${source.width/target.width}, ${source.height/target.height})`;
    const animation=frame.current.animate([{transform:from},{transform:'translate(0px, 0px) scale(1, 1)'}],{
      duration:WELCOME.transferLanding,easing:'cubic-bezier(.77,0,.175,1)',fill:'both',
    });
    return ()=>animation.cancel();
  },[source,target]);

  return <div ref={frame} className="welcome-cup-transfer" data-landed={landed} style={{left:target.left,top:target.top,width:target.width,height:target.height}} aria-hidden="true">
    <motion.svg className="welcome-transfer-drawing" viewBox="327 195 166 107" preserveAspectRatio="none" fill="none" initial={{opacity:1}} animate={{opacity:0}} transition={{duration:.32,delay:.48}}>
      <defs><clipPath id="transfer-cup-clip"><motion.path initial={{d:tea}} animate={{d:takeaway}} transition={{duration:.68,ease}}/></clipPath></defs>
      <g clipPath="url(#transfer-cup-clip)">
        <path d="M338 210H493V305H338Z" fill="url(#welcome-porcelain)"/>
        <path d="M340 220H452V285H340Z" fill="url(#welcome-coffee)" fillOpacity=".96"/>
        <ellipse cx="395" cy="220" rx="53" ry="10" fill="#bda477"/>
        <ellipse cx="395" cy="220" rx="47" ry="7" fill="#8f724d"/>
        <motion.path d="M332 215H490V305H332Z" fill="#dfd1b5" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.5,delay:.1}}/>
      </g>
      <motion.path stroke="#e8e8ce" strokeWidth="1.6" initial={{d:tea}} animate={{d:takeaway}} transition={{duration:.68,ease}}/>
      <motion.g stroke="#e8e8ce" strokeWidth="1.6" strokeLinecap="round" initial={{opacity:1}} animate={{opacity:0}} transition={{duration:.28}}>
        <path d="M451 221c47-17 49 48-5 35M338 210c1-17 113-17 114 0M327 284q68 19 137 0"/>
        <path d="M395 220c-15-11-22 2-10 8l10 6 10-6c12-6 5-19-10-8Z" stroke="#f0dfb9" strokeWidth="1.5" transform="translate(0 110) scale(1 .5)"/>
      </motion.g>
    </motion.svg>
    <motion.div className="welcome-transfer-photograph" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.5,delay:.23,ease:[.23,1,.32,1]}}>
      <div style={{transform:floatPose,transformOrigin:floatOrigin}}><img src="/images/anvid-cup.webp" alt="" draggable="false" style={{transform:cupPose,transformOrigin:cupOrigin}}/></div>
    </motion.div>
  </div>;
}
