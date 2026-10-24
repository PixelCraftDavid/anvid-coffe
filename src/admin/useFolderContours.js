import {useLayoutEffect,useRef} from 'react';

const ns='http://www.w3.org/2000/svg';
const selector='.financial-tile,.sales-chart,.daily-goal,.studio-locations,.daily-notes,.validation-panel,.studio-redemption-brief,.qr-showcase,.sales-history,.ledger-section,.activity-notes>.surface,.opinions-heading,.review-card';
export function folderPath(w,h,anchor,notch=false){
  const r=Math.min(27,w*.09,h*.2),step=Math.min(17,h*.075),tab=anchor;
  const top=`M ${r} 0 H ${tab-r} C ${tab} 0 ${tab} 0 ${tab+r*.35} ${step*.5} C ${tab+r*.7} ${step} ${tab+r} ${step} ${tab+r*1.6} ${step} H ${w-r} Q ${w} ${step} ${w} ${step+r} V ${h-r} Q ${w} ${h} ${w-r} ${h}`;
  const bottom=` H ${tab+r*1.6} C ${tab+r} ${h} ${tab+r*.7} ${h} ${tab+r*.35} ${h-step*.5} C ${tab} ${h-step} ${tab} ${h-step} ${tab-r} ${h-step} H ${r} Q 0 ${h-step} 0 ${h-step-r}`;
  const middle=h*.61,depth=Math.min(24,w*.038);
  const side=notch?` V ${middle+29} C 0 ${middle+16} ${depth} ${middle+14} ${depth} ${middle} C ${depth} ${middle-14} 0 ${middle-16} 0 ${middle-29}`:'';
  return `${top}${bottom}${side} V ${r} Q 0 0 ${r} 0 Z`;
}
// Measure on layout changes only. All contours are static during animation;
// fixed-size shoulders preserve legibility in both tall and narrow cards.
export default function useFolderContours(host,key){
  const definitions=useRef(null);
  useLayoutEffect(()=>{
    if(!host.current||!definitions.current)return;
    const items=new Map();let frame=0,serial=0;
    function measure(element){const item=items.get(element);if(!item)return;const w=element.clientWidth,h=element.clientHeight;if(!w||!h||w===item.w&&h===item.h)return;item.w=w;item.h=h;const column=matchMedia('(min-width:701px)').matches?(host.current.clientWidth-32)/3:w;item.path.setAttribute('d',folderPath(w,h,Math.min(w*.38,column*.38)));}
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>measure(entry.target))):null;
    function scan(){
      frame=0;
      for(const [element,item] of items)if(!host.current.contains(element)){resize?.unobserve(element);item.clip.remove();items.delete(element);}
      host.current.querySelectorAll(selector).forEach(element=>{
        if(items.has(element)){measure(element);return;}
        const clip=document.createElementNS(ns,'clipPath'),path=document.createElementNS(ns,'path'),id=`anvid-folder-${key}-${++serial}`;
        clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(path);definitions.current.append(clip);
        items.set(element,{clip,path,w:0,h:0});measure(element);element.style.clipPath=`url(#${id})`;element.dataset.folderContour='true';resize?.observe(element);
      });
    }
    const mutation=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(scan);});
    mutation.observe(host.current,{childList:true,subtree:true});scan();
    return()=>{mutation.disconnect();resize?.disconnect();cancelAnimationFrame(frame);for(const [element,item] of items){element.style.removeProperty('clip-path');delete element.dataset.folderContour;item.clip.remove();}};
  },[key]);
  return definitions;
}
