import { mkdir,writeFile } from 'node:fs/promises';
import { renderCoffeePourAudio } from '../src/coffeeWelcomeAudio.js';

// Bake original foley once, keeping sample synthesis off the visitor's UI thread.
const rate=44100,{left,right}=renderCoffeePourAudio(rate);
const bytes=Buffer.alloc(44+left.length*4);
bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVE',8);
bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);
bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*4,28);
bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);
bytes.writeUInt32LE(left.length*4,40);
for(let i=0;i<left.length;i++) {
  bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,left[i]))*32767),44+i*4);
  bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,right[i]))*32767),46+i*4);
}
const directory=new URL('../public/audio/',import.meta.url);
await mkdir(directory,{recursive:true});
await writeFile(new URL('coffee-pour.wav',directory),bytes);
console.log(`Original coffee pour: ${bytes.length} bytes, ${rate} Hz stereo.`);
