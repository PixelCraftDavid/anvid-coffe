import { PAPER_TOSS } from './paperTossTimeline.js';
import { renderWinCelebrationAudio } from './winCelebrationAudio.js';
import { renderScratchTexture, createScratchController } from './scratchAudio.js';
import { COFFEE_WELCOME } from './coffeeWelcomeTimeline.js';

let context, output, paperBuffer, winBuffer, reducedWinBuffer, scratchBuffer, welcomeBuffer;
let enabled = false;
const active = new Set();

// Original, deterministic foley: filtered paper crackles, a short metallic rim
// resonance, then a soft paper landing. No downloads or microphone access.
export function renderPaperTossAudio(sampleRate) {
  const length = Math.ceil(sampleRate * PAPER_TOSS.duration / 1000);
  const left = new Float32Array(length), right = new Float32Array(length);
  let seed = 73651;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296 * 2 - 1; };
  const add = (start, duration, pan, sample) => {
    const first = Math.round(start * sampleRate), count = Math.round(duration * sampleRate);
    const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
    for (let i=0;i<count && first+i<length;i++) {
      const t=i/sampleRate, value=sample(t,i/count) * Math.min(t/.0015,1) * Math.min((duration-t)/.008,1);
      left[first+i] += value*l; right[first+i] += value*r;
    }
  };
  const rustle = (start, duration, gain, pan=0) => {
    let low=0, band=0;
    add(start,duration,pan,(t,p)=>{
      const white=random();
      low += .11*(white-low); band += .5*(white-band);
      const envelope=Math.pow(Math.sin(Math.PI*p),1.2);
      const grain=.5+.5*Math.abs(Math.sin(t*390+Math.sin(t*73)*2));
      return (band-low)*envelope*grain*gain;
    });
  };
  const folds = [[.035,.19,.38],[.20,.23,.47],[.39,.18,.42],[.56,.24,.58],[.79,.21,.50],[.97,.25,.59],[1.18,.20,.46],[1.35,.18,.32]];
  for (const [start,duration,gain] of folds) rustle(start,duration,gain);
  for (const [start,gain] of [[.12,.13],[.28,.16],[.46,.12],[.65,.18],[.85,.12],[1.08,.16],[1.24,.12],[1.43,.09]]) {
    add(start,.032,0,t=>random()*Math.exp(-t*125)*gain);
  }
  const rim=PAPER_TOSS.rim/1000;
  add(rim,.27,.3,t=>{
    const modes=[[1375,.20,.085],[2235,.12,.065],[3260,.065,.042],[4660,.028,.025]];
    let value=0;
    for(const [frequency,gain,decay] of modes) value += Math.sin(2*Math.PI*frequency*t)*gain*Math.exp(-t/decay);
    return value + random()*.13*Math.exp(-t*190);
  });
  rustle(rim+.004,.075,.19,.3);
  const landing=PAPER_TOSS.landing/1000;
  add(landing,.24,.28,t=>{
    const thud=Math.sin(2*Math.PI*(155*t-110*t*t))*.25*Math.exp(-t*36);
    const wire=(Math.sin(2*Math.PI*710*t)+Math.sin(2*Math.PI*1140*t)*.35)*.026*Math.exp(-t*27);
    return thud+wire;
  });
  rustle(landing,.20,.32,.28);
  let peak=0;
  for(let i=0;i<length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain=.72/Math.max(peak,.72);
  for(let i=0;i<length;i++) {left[i]*=gain;right[i]*=gain;}
  return {left,right};
}

function graph() {
  if (context?.state === 'closed') { context=null; output=null; paperBuffer=null; winBuffer=null; reducedWinBuffer=null;scratchBuffer=null;welcomeBuffer=null; }
  if (!context) {
    const AudioCtx=window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    context=new AudioCtx({latencyHint:'interactive'});
    output=context.createGain(); output.gain.value=0; output.connect(context.destination);
  }
  return context;
}

function getPaperBuffer(ctx) {
  if (!paperBuffer) {
    const {left,right}=renderPaperTossAudio(ctx.sampleRate);
    paperBuffer=ctx.createBuffer(2,left.length,ctx.sampleRate);
    paperBuffer.copyToChannel(left,0); paperBuffer.copyToChannel(right,1);
  }
  return paperBuffer;
}

function getWinBuffer(ctx,reducedMotion=false) {
  const cached=reducedMotion?reducedWinBuffer:winBuffer;
  if(cached) return cached;
  const {left,right}=renderWinCelebrationAudio(ctx.sampleRate,reducedMotion);
  const buffer=ctx.createBuffer(2,left.length,ctx.sampleRate);
  buffer.copyToChannel(left,0);buffer.copyToChannel(right,1);
  if(reducedMotion) reducedWinBuffer=buffer;else winBuffer=buffer;
  return buffer;
}

function getScratchBuffer(ctx) {
  if(!scratchBuffer) {
    const samples=renderScratchTexture(ctx.sampleRate);
    scratchBuffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);
    scratchBuffer.copyToChannel(samples,0);
  }
  return scratchBuffer;
}

function getWelcomeBuffer(ctx) {
  // Fetch and decode asynchronously. The expensive liquid synthesis is baked
  // into this local asset by scripts/render-coffee-pour.mjs, never during entry.
  if (!welcomeBuffer) welcomeBuffer=fetch(`/audio/coffee-pour.wav?v=${COFFEE_WELCOME.duration}`)
    .then(response=>{if(!response.ok) throw new Error('Optional pour audio unavailable');return response.arrayBuffer();})
    .then(bytes=>ctx.decodeAudioData(bytes))
    .catch(error=>{welcomeBuffer=null;throw error;});
  return welcomeBuffer;
}

export function createScratchSound() {
  const silent={move(){},stop(){},dispose(){}};
  if(!enabled || !context) return silent;
  try {
    const controller=createScratchController(context,output,getScratchBuffer(context),()=>enabled);
    const dispose=()=>{controller.dispose();active.delete(dispose);};
    active.add(dispose);
    return {move:controller.move,stop:controller.stop,dispose};
  } catch {return silent;}
}

export function setExperienceSound(next, { resume = true, warm = true } = {}) {
  enabled=next;
  try {
    const ctx=next?graph():context;
    if (!ctx) return;
    output.gain.cancelScheduledValues(ctx.currentTime);
    output.gain.setTargetAtTime(next ? .48 : 0,ctx.currentTime,.012);
    if (next) {
      // Trusted input handlers resume synchronously; the welcome only attempts
      // already-permitted playback, without trying to bypass autoplay policy.
      if (resume) void ctx.resume().catch(()=>{});
      if (warm) { getPaperBuffer(ctx);getWinBuffer(ctx);getScratchBuffer(ctx); }
    } else {
      for(const cancel of [...active]) cancel();
    }
  } catch { /* Audio is optional and never blocks the game. */ }
}

export function resumeExperienceSound() {
  if (enabled && context) void context.resume().catch(()=>{});
}

export function playResultTone(won) {
  if (!enabled) return;
  try {
    const ctx=graph(); if (!ctx) return;
    void ctx.resume().catch(()=>{});
    (won?[523.25,659.25,783.99,1046.5]:[392,523.25]).forEach((frequency,i)=>{
      const oscillator=ctx.createOscillator(), gain=ctx.createGain();
      const at=ctx.currentTime+i*.1;
      oscillator.type='sine'; oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(.10,at+.02); gain.gain.exponentialRampToValueAtTime(.001,at+.5);
      oscillator.connect(gain); gain.connect(output);
      const cancel=()=>{try{oscillator.stop();}catch{} oscillator.disconnect();gain.disconnect();active.delete(cancel);};
      active.add(cancel); oscillator.onended=cancel; oscillator.start(at); oscillator.stop(at+.6);
    });
  } catch { /* Audio is optional. */ }
}

export function schedulePaperTossAudio(epoch) {
  return scheduleBufferAudio(epoch,getPaperBuffer);
}

export function scheduleWinCelebrationAudio(epoch,reducedMotion=false) {
  return scheduleBufferAudio(epoch,ctx=>getWinBuffer(ctx,reducedMotion));
}

export function scheduleWelcomePourAudio(epoch,onReady) {
  let stopped=false,stop=()=>{};
  const cancel=()=>{stopped=true;stop();active.delete(cancel);document.removeEventListener('visibilitychange',hidden);};
  const hidden=()=>{if(document.hidden) cancel();};
  try {
    setExperienceSound(true,{resume:false,warm:false});
    const ctx=context;
    if(!ctx || document.hidden) return cancel;
    active.add(cancel);document.addEventListener('visibilitychange',hidden);
    void getWelcomeBuffer(ctx).then(buffer=>{
      active.delete(cancel);document.removeEventListener('visibilitychange',hidden);
      if(stopped || !enabled || document.hidden || context!==ctx) return;
      stop=scheduleBufferAudio(epoch,()=>buffer,{waitForRunning:true,onReady});
    }).catch(cancel);
  } catch {cancel();}
  return cancel;
}

function scheduleBufferAudio(epoch,getBuffer,{waitForRunning=false,onReady}={}) {
  if (!enabled || !context) return ()=>{};
  const ctx=context;
  let source, cancelled=false;
  const cancel=()=>{
    cancelled=true;
    if(source) {source.onended=null;try{source.stop();}catch{} source.disconnect();}
    active.delete(cancel);
    document.removeEventListener('visibilitychange',onVisibility);
    if(waitForRunning) ctx.removeEventListener('statechange',onState);
  };
  const onVisibility=()=>{if(document.hidden) cancel();};
  const schedule=()=>{
    if(cancelled || source || !enabled || document.hidden || ctx.state!=='running') return;
    try {
      const buffer=getBuffer(ctx);
      const now=performance.now();
      const stamp=ctx.getOutputTimestamp?.();
      // Align the audible output with the performance-clock animation epoch.
      let at=stamp?.performanceTime>0 && stamp.contextTime>0
        ? stamp.contextTime+(epoch-stamp.performanceTime)/1000
        : ctx.currentTime+(epoch-now)/1000-(ctx.outputLatency || ctx.baseLatency || 0);
      const offset=Math.max(0,ctx.currentTime-at);
      at=Math.max(ctx.currentTime,at);
      if(offset>=buffer.duration) {cancel();return;}
      source=ctx.createBufferSource();source.buffer=buffer;source.connect(output);
      source.onended=cancel;source.start(at,offset);
      onReady?.();
    } catch {cancel();}
  };
  const onState=()=>{if(ctx.state==='running') schedule();else if(ctx.state==='closed') cancel();};
  active.add(cancel); document.addEventListener('visibilitychange',onVisibility);
  if(waitForRunning) ctx.addEventListener('statechange',onState);
  if(ctx.state==='running') schedule(); else if(!waitForRunning) void ctx.resume().then(schedule).catch(cancel);
  return cancel;
}
