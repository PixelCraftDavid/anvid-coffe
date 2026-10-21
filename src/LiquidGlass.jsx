import { useId, useLayoutEffect, useRef } from 'react';
import { createGlassDisplacement } from './glassDisplacement.js';

export default function LiquidGlass() {
  const id = `anvid-lens-${useId().replace(/:/g, '')}`;
  const hostRef = useRef(null), filterRef = useRef(null), imageRef = useRef(null), opticsRef = useRef(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    // URL backdrop filters are a progressive enhancement in Chromium. Other
    // engines retain the layered frosted material rather than an empty filter.
    if (!window.chrome || !CSS.supports('backdrop-filter', `url("#${id}")`)) return;
    let timer, previous = '';
    const update = () => {
      // Layout dimensions stay correct while Motion scales the outer card.
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      const radius = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 30;
      host.style.setProperty('--glass-radius',`${radius}px`);
      const signature = `${width}:${height}:${radius}`;
      if (signature === previous) return;
      previous = signature;
      const canvas = document.createElement('canvas');canvas.width = width;canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(new ImageData(createGlassDisplacement(width,height,radius),width,height),0,0);
      filterRef.current.setAttribute('width',width);filterRef.current.setAttribute('height',height);
      imageRef.current.setAttribute('width',width);imageRef.current.setAttribute('height',height);
      imageRef.current.setAttribute('href',canvas.toDataURL());
      opticsRef.current.style.backdropFilter = `url("#${id}") saturate(1.5)`;
      host.dataset.refraction = 'native';
    };
    update();
    const observer = new ResizeObserver(() => {clearTimeout(timer);timer=setTimeout(update,110);});
    observer.observe(host);
    return () => {observer.disconnect();clearTimeout(timer);};
  }, [id]);

  return <div ref={hostRef} className="liquid-glass-material" data-refraction="frosted" aria-hidden="true">
    <svg className="glass-definitions" width="0" height="0" focusable="false"><defs><filter ref={filterRef} id={id} x="0" y="0" width="1" height="1" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feImage ref={imageRef} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lens-map"/><feDisplacementMap in="SourceGraphic" in2="lens-map" scale="46" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".45"/></filter></defs></svg>
    <div ref={opticsRef} className="glass-optics"/>
    <div className="glass-centre-frost"/>
    <div className="glass-olive-tint"/>
    <div className="glass-inner-rim"/>
    <div className="glass-specular-rim"/>
  </div>;
}
