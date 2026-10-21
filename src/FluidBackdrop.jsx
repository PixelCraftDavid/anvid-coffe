import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

// A slow olive light field. The image remains photographic; this shader supplies
// the flowing colour around it and its black falloff. It also has a CSS fallback.
export default function FluidBackdrop({paused=false}) {
  const canvasRef = useRef(null);
  const pausedRef=useRef(paused),resumeRef=useRef(null);
  pausedRef.current=paused;
  const reduced = useReducedMotion();
  useEffect(()=>{resumeRef.current?.();},[paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;
    const vertexSource = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
    const fragmentSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
      }
      float field(vec2 p) {
        float value=0.; float amplitude=.5;
        for(int i=0;i<4;i++){value+=amplitude*noise(p);p=p*2.02+vec2(2.3,4.7);amplitude*=.5;}
        return value;
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/resolution;
        vec2 p=uv*vec2(resolution.x/resolution.y,1.);
        float t=time*.065;
        vec2 drift=vec2(field(p*1.5+vec2(t,-t*.6)),field(p*1.5+vec2(4.1,-t*.5)));
        float flow=field(p*2.1+drift*2.5+vec2(t*.3,t*.2));
        vec3 dark=vec3(.014,.023,.012);
        vec3 olive=vec3(.27,.32,.17);
        vec3 sage=vec3(.38,.41,.23);
        vec3 colour=mix(dark,olive,smoothstep(.2,.73,flow));
        colour=mix(colour,sage,smoothstep(.56,.86,flow)*.65);
        vec2 centre=vec2(.5+.02*sin(t),.6);
        float vignette=1.-smoothstep(.2,.83,length((uv-centre)*vec2(1.18,.9)));
        colour*=mix(.08,1.,vignette);
        colour+=(hash(gl_FragCoord.xy)-.5)*.022;
        gl_FragColor=vec4(colour,1.);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'resolution');
    const time = gl.getUniformLocation(program, 'time');
    let frame = 0, previous = -1000;
    const start = performance.now();
    const draw = (now) => {
      if (now - previous >= 1000 / 30) {
        gl.uniform1f(time, reduced ? 0 : (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6); previous = now;
      }
      if (!reduced && !document.hidden && !pausedRef.current) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(.65, 1200 / rect.width);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      previous = -1000; gl.uniform1f(time, reduced ? 0 : (performance.now() - start) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const onVisibility = () => { cancelAnimationFrame(frame); if (!document.hidden && !reduced && !pausedRef.current) frame = requestAnimationFrame(draw); };
    resumeRef.current=onVisibility;
    document.addEventListener('visibilitychange', onVisibility);
    resize(); frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility);
      resumeRef.current=null;
      gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="fluid-field" aria-hidden="true"/>;
}
