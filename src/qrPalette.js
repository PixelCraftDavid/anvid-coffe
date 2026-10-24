export const qrColors={paper:'#fff8e9',espresso:'#59391e',caramel:'#85592f',forest:'#30543b',olive:'#626b39',cream:'#f9e8c1',sage:'#a8bd8a'};
const rgb=value=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
function mix(a,b,t){const x=rgb(a),y=rgb(b);return '#'+x.map((value,i)=>Math.round(value+(y[i]-value)*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');}
// Coffee, handle and garden areas share the scene's actual material positions.
export function qrInk(row,column,size){
  const x=(column+.5)/size-.5,z=(row+.5)/size-.5;
  if(Math.abs(x)<.25&&Math.abs(z)<.25)return mix(qrColors.espresso,qrColors.caramel,(x+z+.5));
  if(x>.18&&x<.4&&Math.abs(z)<.15)return mix(qrColors.forest,qrColors.olive,.4);
  if(z>.25&&Math.abs(x)>.2)return mix(qrColors.espresso,qrColors.caramel,(x+.5));
  return mix(qrColors.olive,qrColors.forest,(z+.5)*.8+(x+.5)*.2);
}
