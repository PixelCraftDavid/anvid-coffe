import { WIN_CELEBRATION as WIN } from './winCelebrationTimeline.js';

export function renderWinCelebrationAudio(sampleRate,reducedMotion=false) {
  const length=Math.ceil(sampleRate*WIN.audioDuration/1000);
  const left=new Float32Array(length),right=new Float32Array(length);
  let seed=98621;
  const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296*2-1;};
  const add=(start,duration,pan,sample)=>{
    const first=Math.round(start*sampleRate),count=Math.round(duration*sampleRate);
    const l=Math.cos((pan+1)*Math.PI/4),r=Math.sin((pan+1)*Math.PI/4);
    for(let i=0;i<count && first+i<length;i++) {
      const t=i/sampleRate,p=i/count;
      const value=sample(t,p)*Math.min(t/.0015,1)*Math.min((duration-t)/.012,1);
      left[first+i]+=value*l;right[first+i]+=value*r;
    }
  };
  // A restrained rising chime confirms the win as the cup arrives.
  [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{
    add(.07+i*.085,.65,(i-1.5)*.12,t=>Math.sin(2*Math.PI*frequency*t)*.055*Math.exp(-t*6));
  });
  if(reducedMotion) return {left,right};
  const lid=WIN.lid/1000;
  add(lid,.075,.12,t=>{
    const snap=noise()*.19*Math.exp(-t*90);
    const body=Math.sin(2*Math.PI*285*t)*.11*Math.exp(-t*65);
    return snap+body;
  });
  let airLow=0;
  add(lid+.025,.32,.18,(t,p)=>{
    airLow+=.13*(noise()-airLow);
    return airLow*Math.sin(Math.PI*p)*.16;
  });
  // Gentle air releases follow the seven staggered balloon launches.
  const pans=[-.55,-.3,-.65,.55,.3,.65,-.45];
  pans.forEach((pan,i)=>{
    let low=0,high=0;
    add((WIN.balloons+i*WIN.balloonStagger)/1000,.43,pan,(t,p)=>{
      const white=noise();low+=.035*(white-low);high+=.22*(white-high);
      const envelope=Math.sin(Math.PI*p)**1.4;
      const lift=Math.sin(2*Math.PI*((270+i*17)*t+150*t*t))*.012;
      return ((high-low)*.12+lift)*envelope;
    });
  });
  const confetti=WIN.confetti/1000;
  add(confetti,.14,0,t=>noise()*.29*Math.exp(-t*38)+Math.sin(2*Math.PI*110*t)*.10*Math.exp(-t*45));
  // Quiet paper flutters track the particle groups, rather than looping applause.
  for(let i=0;i<8;i++) {
    let low=0;
    add(confetti+i*WIN.confettiStagger/1000,.28,Math.sin(i*2.4)*.65,(t,p)=>{
      const white=noise();low+=.14*(white-low);
      return (white-low)*.035*Math.sin(Math.PI*p)*(.5+.5*Math.sin(t*140)**2);
    });
  }
  [1318.51,1567.98,2093].forEach((frequency,i)=>{
    add(confetti+.12+i*.12,.75,(i-1)*.25,t=>Math.sin(2*Math.PI*frequency*t)*.028*Math.exp(-t*7));
  });
  let peak=0;
  for(let i=0;i<length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain=.64/Math.max(peak,.64);
  for(let i=0;i<length;i++){left[i]*=gain;right[i]*=gain;}
  return {left,right};
}
