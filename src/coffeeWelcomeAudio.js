import { COFFEE_WELCOME as WELCOME } from './coffeeWelcomeTimeline.js';

// Original liquid foley: turbulent flow, tiny irregular bubble impacts and a
// shortening air cavity as the cup fills. No musical tones or external assets.
export function renderCoffeePourAudio(sampleRate) {
  const length = Math.ceil(sampleRate * WELCOME.duration / 1000);
  const left = new Float32Array(length), right = new Float32Array(length);
  let seed = 918273;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x*x*(3-2*x); };
  const pour = WELCOME.pour / 1000, end = (WELCOME.pour + WELCOME.pourDuration) / 1000;
  const contact = WELCOME.fill / 1000;
  let low = 0, high = 0, body = 0, modulation = 0;
  let cavity1 = 0, cavity2 = 0, coefficient = 0;
  const radius = Math.exp(-Math.PI * 310 / sampleRate);
  const lowRate = 1-Math.exp(-2*Math.PI*420/sampleRate);
  const highRate = 1-Math.exp(-2*Math.PI*5800/sampleRate);
  const bodyRate = 1-Math.exp(-2*Math.PI*1250/sampleRate);
  for (let i = Math.floor(pour*sampleRate); i < Math.ceil(end*sampleRate); i++) {
    const t = i / sampleRate;
    const fill = Math.max(0, Math.min(1, (t-contact)/(end-contact)));
    const white = random()*2-1;
    low += lowRate*(white-low); high += highRate*(white-high); body += bodyRate*(white-body);
    modulation += .0018*(random()-modulation);
    if (i % 64 === 0) coefficient = 2*radius*Math.cos(2*Math.PI*(690+920*fill)/sampleRate);
    const cavity = (body-low)*.028 + coefficient*cavity1 - radius*radius*cavity2;
    cavity2 = cavity1; cavity1 = cavity;
    const envelope = smooth((t-pour)/.065)*smooth((end-t)/.11);
    const inCup = smooth((t-contact)/.045);
    // A quiet stream becomes a fuller, hollow splash on contact with the cup.
    const stream = (high-low)*(.045+.18*inCup)*(.72+modulation*.65);
    const liquid = stream + cavity*.055*inCup + low*.065*inCup;
    left[i] += liquid*envelope*.84; right[i] += liquid*envelope*1.16;
  }
  const droplet = (at, gain, fill, pan) => {
    const count = Math.ceil(.105*sampleRate), start = Math.round(at*sampleRate);
    const frequency = 730+fill*1000+random()*440;
    const l = Math.cos((pan+1)*Math.PI/4), r = Math.sin((pan+1)*Math.PI/4);
    let phase = 0, filtered = 0;
    for (let i = 0; i < count && start+i < length; i++) {
      const t = i/sampleRate;
      phase += 2*Math.PI*frequency*(1+.24*Math.exp(-t*100))/sampleRate;
      filtered += .36*((random()*2-1)-filtered);
      const value = (Math.sin(phase)*Math.exp(-t*105)*.52
        + Math.sin(phase*1.87)*Math.exp(-t*160)*.13
        + filtered*Math.exp(-t*80)*.8)*gain*smooth(t/.002);
      left[start+i] += value*l; right[start+i] += value*r;
    }
  };
  // Many small, uneven impacts make a pour rather than a repeating water loop.
  for (let at = contact; at < end-.045;) {
    const fill = (at-contact)/(end-contact);
    droplet(at, .024+random()*.065, fill, .05+random()*.22);
    at += .008+random()*.028;
  }
  droplet(WELCOME.drip/1000, .12, .94, .16);
  droplet(WELCOME.lastDrip/1000, .085, 1, .12);
  // Low-level early room reflections add space without a long reverberant tail.
  const directLeft = left.slice(), directRight = right.slice();
  const early = Math.round(.019*sampleRate), late = Math.round(.033*sampleRate);
  for (let i = late; i < length; i++) {
    left[i] += directRight[i-early]*.09 + directLeft[i-late]*.045;
    right[i] += directLeft[i-early]*.08 + directRight[i-late]*.05;
  }
  let peak = 0;
  for (let i=0;i<length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain = .6/Math.max(.6,peak);
  for (let i=0;i<length;i++) {left[i]*=gain;right[i]*=gain;}
  return {left,right};
}
