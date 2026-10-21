// Dry, granular friction for the card's foil. The texture never plays by itself:
// pointer motion opens its gain, and the audio clock closes it when motion stops.
export function renderScratchTexture(sampleRate) {
  const samples=new Float32Array(Math.ceil(sampleRate*2));
  let seed=82173,low=0,mid=0,grain=0;
  for(let i=0;i<samples.length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const white=(seed>>>0)/4294967296*2-1;
    low+=.022*(white-low);mid+=.43*(white-mid);
    grain+=.007*(Math.abs(white)-grain);
    const roughness=.58+.42*Math.sin(i*.019+Math.sin(i*.0017)*3)**2;
    const grit=Math.abs(white)>.965?white*.15:0;
    const edge=Math.min(i/240,(samples.length-1-i)/240,1);
    samples[i]=((mid-low)*roughness*.85+grit)*( .8+grain*.4)*edge;
  }
  return samples;
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hold=(param,now,fallback)=>{
  if(param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
  else {param.cancelScheduledValues(now);param.setValueAtTime(fallback,now);}
};

export function createScratchController(ctx,output,buffer,isEnabled) {
  let voice=null,idleTimer,disposed=false,speed=0,stroke=0;
  const envelopeAt=(current,now)=>{
    if(!current.envelope) return 0;
    const {at,from,level}=current.envelope,elapsed=Math.max(0,now-at);
    const attack=level+(from-level)*Math.exp(-Math.min(elapsed,.04)/.005);
    return elapsed<=.04?attack:attack*Math.exp(-(elapsed-.04)/.008);
  };
  const stop=()=>{
    clearTimeout(idleTimer);speed=0;
    if(!voice) return;
    const old=voice;voice=null;
    const now=ctx.currentTime;
    hold(old.gain.gain,now,envelopeAt(old,now));
    old.gain.gain.setTargetAtTime(0,now,.003);
    try{old.source.stop(now+.018);}catch{old.cleanup();}
  };
  const createVoice=()=>{
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    const high=ctx.createBiquadFilter();high.type='highpass';high.frequency.value=260;high.Q.value=.5;
    const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=3600;low.Q.value=.65;
    const gain=ctx.createGain();gain.gain.value=0;
    const pan=ctx.createStereoPanner?.();
    source.connect(high);high.connect(low);low.connect(gain);
    if(pan){gain.connect(pan);pan.connect(output);}else gain.connect(output);
    const cleanup=()=>{source.onended=null;[source,high,low,gain,pan].forEach(node=>node?.disconnect());};
    source.onended=cleanup;
    source.start(ctx.currentTime,(stroke++*.173)%buffer.duration);
    return {source,high,low,gain,pan,cleanup,envelope:null};
  };
  const move=({speed:nextSpeed,pan=0,pressure=.5,freshness=1})=>{
    if(disposed || !isEnabled() || ctx.state!=='running' || !Number.isFinite(nextSpeed) || nextSpeed<12) return;
    try {
      voice ||= createVoice();
      const now=ctx.currentTime;
      speed=speed?speed*.5+clamp(nextSpeed,0,2600)*.5:clamp(nextSpeed,0,2600);
      const energy=1-Math.exp(-speed/620);
      const level=(.07+.31*energy)*(.75+.25*clamp(pressure,0,1))*(.35+.65*clamp(freshness,0,1));
      const current=envelopeAt(voice,now);
      hold(voice.gain.gain,now,current);
      voice.gain.gain.setTargetAtTime(level,now,.005);
      // Scheduled silence is independent of JS timers, even on a busy main thread.
      voice.gain.gain.setTargetAtTime(0,now+.04,.008);
      voice.source.playbackRate.setTargetAtTime(.65+energy*1.1,now,.02);
      voice.low.frequency.setTargetAtTime(1800+energy*4600,now,.015);
      voice.pan?.pan.setTargetAtTime(clamp(pan,-.45,.45),now,.02);
      voice.envelope={at:now,from:current,level};
      clearTimeout(idleTimer);idleTimer=setTimeout(stop,95);
    } catch {stop();}
  };
  const dispose=()=>{if(disposed)return;disposed=true;stop();};
  return {move,stop,dispose};
}
