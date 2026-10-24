import {useEffect,useRef,useState} from 'react';
import {createQrCanvas} from './qrTexture.js';
import {renderQrCup,createCupMotion,voxelCoffee} from './qrCupScene.js';
import './qrCup.css';

export default function QrCup({payload,label='Código QR',onFlat}){
  const canvas=useRef(null),motion=useRef(null),target=useRef(false);
  const [depth,setDepth]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let active=true,observer,intersection;setReady(false);setError('');target.current=false;setDepth(false);
    const element=canvas.current;
    Promise.resolve().then(()=>{
      const {canvas:texture,modules}=createQrCanvas(payload);
      if(!active)return;let width=0,visible=true;const cells=voxelCoffee(modules);
      const draw=value=>{if(!active||!visible||document.hidden)return;const ctx=element.getContext('2d');if(ctx)renderQrCup(ctx,texture,value,width,width,cells);};
      const controller=createCupMotion({draw});motion.current=controller;
      function resize(){width=Math.round(element.clientWidth);const dpr=Math.min(devicePixelRatio||1,1.5);element.width=Math.round(width*dpr);element.height=element.width;element.getContext('2d')?.setTransform(dpr,0,0,dpr,0,0);controller.redraw();}
      resize();observer=new ResizeObserver(resize);observer.observe(element);
      intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)controller.pause();else controller.redraw();});intersection.observe(element);
      element._qrVisibility=()=>{if(document.hidden)controller.pause();else controller.redraw();};document.addEventListener('visibilitychange',element._qrVisibility);setReady(true);
    }).catch(()=>{if(active)setError('No pudimos dibujar el QR. Vuelve a abrirlo.');});
    return()=>{active=false;observer?.disconnect();intersection?.disconnect();motion.current?.dispose();motion.current=null;document.removeEventListener('visibilitychange',element._qrVisibility);};
  },[payload]);
  function toggle(event){const next=!target.current;target.current=next;setDepth(next);motion.current?.to(next?1:0,event.detail===0||matchMedia('(prefers-reduced-motion: reduce)').matches);if(!next)onFlat?.();}
  return <div className="qr-cup"><button type="button" className="qr-cup-scene" disabled={!ready} onClick={toggle} aria-label={`${label}. Vista ${depth?'3D. Toca para volver al QR plano':'2D. Toca para descubrir la taza 3D'}.`} aria-pressed={depth}><canvas ref={canvas} aria-hidden="true"/>{!ready&&<span role="status">{error||'Dibujando tu QR…'}</span>}</button><p className="qr-cup-hint" aria-live="polite">{depth?'Toca la taza para volver al QR y escanear.':'Vista superior · toca el QR para descubrir la taza.'}</p></div>;
}
