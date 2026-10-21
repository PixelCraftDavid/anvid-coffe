import { useEffect, useRef } from 'react';

const vertexSource = `
  attribute vec2 uv;
  uniform vec2 viewport;
  uniform float paperWidth;
  uniform float progress;
  varying mediump vec2 textureUV;
  varying mediump vec3 surface;
  float noise(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main() {
    vec2 q = uv * 2. - 1.;
    float p = smoothstep(0.,1.,progress);
    float edge = max(abs(q.x),abs(q.y));
    float fold = clamp(p + edge * .17 * sin(p * 3.14159),0.,1.);
    float ridge = sin(q.x * 11. + q.y * 4.) * cos(q.y * 13. - q.x * 3.);
    float radius = 30. * (1. + .12 * ridge + .07 * (noise(uv) - .5));
    float longitude = q.x * 3.15;
    float latitude = q.y * 1.35;
    vec3 crumpled = vec3(radius * sin(longitude) * cos(latitude),radius * sin(latitude),radius * cos(longitude) * cos(latitude));
    vec3 paperPlane = vec3(q.x * paperWidth * .5,q.y * 75.,0.);
    vec3 pos = mix(paperPlane,crumpled,fold);
    // Lit, angular folds develop before the edges pack inward.
    pos.z += ridge * 12. * sin(p * 3.14159);
    pos.y += sin(q.x * 9. + q.y * 4.) * 6. * sin(p * 3.14159);
    float turn = p * -.21;
    pos.xy = mat2(cos(turn),sin(turn),-sin(turn),cos(turn)) * pos.xy;
    float tilt = sin(p * 3.14159) * .36;
    pos.yz = mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt)) * pos.yz;
    surface = pos;
    float perspective = 560. / (560. - pos.z);
    vec2 screen = pos.xy * perspective + vec2(viewport.x * .5,85. + p * 10.);
    gl_Position = vec4(screen.x / viewport.x * 2. - 1.,1. - screen.y / viewport.y * 2.,-pos.z / 300.,1.);
    textureUV = uv;
  }
`;

const fragmentSource = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  uniform sampler2D paper;
  varying mediump vec2 textureUV;
  varying mediump vec3 surface;
  void main() {
    vec3 normal = normalize(cross(dFdx(surface),dFdy(surface)));
    if (normal.z < 0.) normal = -normal;
    float light = .7 + .3 * max(dot(normal,normalize(vec3(-.4,-.65,.85))),0.);
    vec3 albedo = texture2D(paper,textureUV).rgb;
    float edgeLight = pow(max(normal.z,0.),8.) * .015;
    gl_FragColor = vec4(albedo * light + edgeLight,1.);
  }
`;

function couponTexture() {
  const canvas = document.createElement('canvas');
  canvas.width=540; canvas.height=300;
  const ctx=canvas.getContext('2d');
  const paper=ctx.createLinearGradient(0,0,540,300);
  paper.addColorStop(0,'#f7f2e4'); paper.addColorStop(.5,'#eee9d9'); paper.addColorStop(1,'#e7e4d1');
  ctx.fillStyle=paper; ctx.fillRect(0,0,540,300);
  let seed=87;
  const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<2300;i++) {
    ctx.fillStyle=i%2?'#746c4910':'#ffffff45';
    ctx.fillRect(random()*540,random()*300,random()*2+.4,.6);
  }
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#46563a'; ctx.font='42px "Instrument Serif", Georgia'; ctx.fillText('anvid',255,49);
  ctx.font='11px "DM Sans", sans-serif'; ctx.fillText('coffe',314,56);
  ctx.font='62px "Instrument Serif", Georgia'; ctx.fillText('Hoy no tocó.',270,130);
  ctx.fillStyle='#748252'; ctx.font='italic 62px "Instrument Serif", Georgia'; ctx.fillText('Lo bonito sigue.',270,193);
  ctx.strokeStyle='#a0a88666'; ctx.setLineDash([3,5]);
  ctx.beginPath(); ctx.moveTo(42,260); ctx.lineTo(498,260); ctx.stroke();
  return canvas;
}

export default function CrumplingCoupon() {
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    canvas.parentElement.dataset.renderer='fallback';
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'});
    if(!gl || !gl.getExtension('OES_standard_derivatives')) {
      canvas.parentElement.dataset.fallbackReason=gl?'derivatives unavailable':'webgl unavailable';
      return;
    }
    const resources=[];
    const compile=(type,source)=>{
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      resources.push(()=>gl.deleteShader(shader));
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
        canvas.parentElement.dataset.fallbackReason=gl.getShaderInfoLog(shader);
        return null;
      }
      return shader;
    };
    const vertex=compile(gl.VERTEX_SHADER,vertexSource),fragment=compile(gl.FRAGMENT_SHADER,fragmentSource);
    if(!vertex || !fragment) {resources.forEach(dispose=>dispose());return;}
    const program=gl.createProgram();
    gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      canvas.parentElement.dataset.fallbackReason=gl.getProgramInfoLog(program);
      gl.deleteProgram(program);resources.forEach(dispose=>dispose());return;
    }
    resources.push(()=>gl.deleteProgram(program)); gl.useProgram(program);
    const columns=36,rows=24,grid=[];
    for(let y=0;y<=rows;y++) for(let x=0;x<=columns;x++) {
      const jitterX=x===0||x===columns?0:Math.sin(x*51.7+y*13.1)*.22;
      const jitterY=y===0||y===rows?0:Math.cos(x*17.3+y*31.9)*.22;
      grid.push([(x+jitterX)/columns,(y+jitterY)/rows]);
    }
    const vertices=[];
    for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      ((x+y)%2?[a,b,c,b,d,c]:[a,b,d,a,d,c]).forEach(i=>vertices.push(...grid[i]));
    }
    const buffer=gl.createBuffer(); resources.push(()=>gl.deleteBuffer(buffer));
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const uv=gl.getAttribLocation(program,'uv');
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture(); resources.push(()=>gl.deleteTexture(texture));
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const bounds=canvas.getBoundingClientRect(),density=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(bounds.width*density); canvas.height=Math.round(bounds.height*density);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(gl.getUniformLocation(program,'viewport'),bounds.width,bounds.height);
    gl.uniform1f(gl.getUniformLocation(program,'paperWidth'),Math.min(270,bounds.width*.82));
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearColor(0,0,0,0);
    const progress=gl.getUniformLocation(program,'progress');
    let frame,cancelled=false;
    document.fonts.ready.then(()=>{
      if(cancelled) return;
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,couponTexture());
      canvas.parentElement.dataset.renderer='webgl';
      const start=performance.now();
      const draw=now=>{
        if(cancelled || gl.isContextLost()) return;
        const p=Math.min((now-start)/1550,1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); gl.uniform1f(progress,p); gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);
        if(p<1) frame=requestAnimationFrame(draw);
      };
      frame=requestAnimationFrame(draw);
    });
    return ()=>{
      cancelled=true; cancelAnimationFrame(frame); resources.forEach(dispose=>dispose());
      // Release this short-lived context after a true unmount, preserving Fast Refresh.
      setTimeout(()=>{if(!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();},0);
    };
  },[]);
  return <div className="crumple-paper">
    <canvas ref={canvasRef} className="paper-crumple-canvas"/>
    <div className="paper-crumple-fallback"><span>anvid <small>coffe</small></span><h2>Hoy no tocó.<br/><em>Lo bonito sigue.</em></h2><i/><i/></div>
  </div>;
}
