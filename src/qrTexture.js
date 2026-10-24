import QRCode from 'qrcode';
import {qrColors,qrInk} from './qrPalette.js';
export function createQrCanvas(payload,scale=8){
  const {modules}=QRCode.create(payload,{errorCorrectionLevel:'M'}),canvas=document.createElement('canvas');
  canvas.width=canvas.height=(modules.size+8)*scale;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle=qrColors.paper;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let row=0;row<modules.size;row++)for(let column=0;column<modules.size;column++)if(modules.get(row,column)){ctx.fillStyle=qrInk(row,column,modules.size);ctx.fillRect((column+4)*scale,(row+4)*scale,scale,scale);}
  return {canvas,modules};
}
