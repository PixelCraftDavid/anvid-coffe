import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

const outline = 'M150 167 134 104 146 52H214L232 104 216 167Z';

function Trace({ d, delay = 0, className = '' }) {
  return <path className={`welcome-trace ${className}`} d={d} pathLength="1" style={{ animationDelay: `${delay}ms` }}/>;
}

export default function CoffeeWelcome({ onComplete }) {
  const dialogRef = useRef(null);
  const callback = useRef(onComplete);
  const leaving = useRef(false);
  const completed = useRef(false);
  const exitTimer = useRef(null);
  const [closing, setClosing] = useState(false);
  callback.current = onComplete;

  function finish() {
    if (completed.current) return;
    completed.current = true;
    clearTimeout(exitTimer.current);
    if (dialogRef.current?.open) dialogRef.current.close();
    callback.current();
  }
  function dismiss() {
    if (leaving.current) return;
    leaving.current = true;
    setClosing(true);
    exitTimer.current = setTimeout(finish, 260);
  }

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) { callback.current(); return; }
    if (!dialog.open) dialog.showModal();
    dialog.focus({preventScroll:true});
    const timer = setTimeout(dismiss, 3200);
    const hidden = () => { if (document.hidden) finish(); };
    const reduced = () => { if (preference.matches) finish(); };
    document.addEventListener('visibilitychange', hidden);
    preference.addEventListener('change', reduced);
    return () => {
      clearTimeout(timer); clearTimeout(exitTimer.current);
      document.removeEventListener('visibilitychange', hidden);
      preference.removeEventListener('change', reduced);
      if (dialog.open) dialog.close();
    };
  }, []);

  return <dialog ref={dialogRef} tabIndex={-1} className="coffee-welcome" data-closing={closing} aria-label="Bienvenido a Anvid Coffe" aria-describedby="welcome-caption" onCancel={event => {event.preventDefault();dismiss();}}>
    <div className="welcome-grain" aria-hidden="true"/>
    <div className="welcome-content">
      <div className="welcome-brand" aria-hidden="true">anvid<span>COFFE & LITTLE RITUALS</span></div>
      <svg className="welcome-illustration" viewBox="0 0 600 320" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="welcome-coffee" x1="0" y1="50" x2="0" y2="280" gradientUnits="userSpaceOnUse"><stop stopColor="#c3a778"/><stop offset="1" stopColor="#6e502f"/></linearGradient>
          <linearGradient id="welcome-porcelain" x1="340" y1="212" x2="450" y2="274" gradientUnits="userSpaceOnUse"><stop stopColor="#f1ebd6" stopOpacity=".07"/><stop offset="1" stopColor="#c2d19a" stopOpacity=".02"/></linearGradient>
          <clipPath id="welcome-pot-clip"><path d={outline}/></clipPath>
          <clipPath id="welcome-cup-clip"><path d="M342 211H448L441 266Q395 284 350 266Z"/></clipPath>
        </defs>
        <ellipse className="welcome-ground" cx="296" cy="289" rx="197" ry="9" fill="#cfdf9b" fillOpacity=".025"/>
        <g className="welcome-pot">
          <g clipPath="url(#welcome-pot-clip)"><path className="welcome-pot-fill" d="M130 74H239V169H130Z" fill="url(#welcome-coffee)" fillOpacity=".3"/></g>
          <g stroke="#e8e8ce" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <Trace d="M140 66C90 48 80 145 141 136" delay={100}/>
            <Trace d={outline}/>
            <Trace d="m223 72 28-19-8 47-11 11M146 52l33-14 35 14M174 40v-7q6-8 13 0v8" delay={110}/>
            <Trace d="M150 167h66v12h-66Zm0 12-11 60q40 18 79 0l-11-60M139 239h79" delay={180}/>
            <Trace className="welcome-pot-detail" d="m161 58-5 47 10 56m31-103 9 47-9 56m-17 24v52m-23-50-5 45m45-45 6 45M140 103h89" delay={270}/>
            <circle className="welcome-pot-valve" cx="199" cy="210" r="3.2" stroke="#c8d5a8"/>
          </g>
        </g>
        <path className="welcome-pour" d="M297 86C323 105 323 163 379 221Q391 245 395 276" pathLength="1" stroke="url(#welcome-coffee)" strokeWidth="3" strokeLinecap="round"/>
        <path className="welcome-pour-shine" d="M298 88C322 110 326 163 379 220Q391 245 394 274" pathLength="1" stroke="#ead7a9" strokeWidth=".7" strokeLinecap="round"/>
        <g clipPath="url(#welcome-cup-clip)">
          <path d="M338 210H452L444 269Q395 289 346 269Z" fill="url(#welcome-porcelain)"/>
          <g className="welcome-cup-fill"><path d="M340 220H452V285H340Z" fill="url(#welcome-coffee)" fillOpacity=".96"/><ellipse cx="395" cy="220" rx="53" ry="10" fill="#bda477"/><ellipse cx="395" cy="220" rx="47" ry="7" fill="#8f724d"/></g>
        </g>
        <g stroke="#e8e8ce" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <Trace d="M451 221c47-17 49 48-5 35" delay={320}/>
          <Trace d="M338 210h114l-8 59q-49 20-98 0Z" delay={240}/>
          <Trace d="M338 210c1-17 113-17 114 0M327 284q68 19 137 0" delay={380}/>
        </g>
        <ellipse className="welcome-ripple" cx="395" cy="222" rx="34" ry="5" stroke="#e6d5aa" strokeWidth=".8"/>
        <path className="welcome-heart" d="M395 220c-15-11-22 2-10 8l10 6 10-6c12-6 5-19-10-8Z" pathLength="1" stroke="#f0dfb9" strokeWidth="1.5"/>
        <g className="welcome-steam" stroke="#d8e3bd" strokeWidth="1.2" strokeLinecap="round"><path d="M378 187c-14-18 13-23 0-42"/><path d="M399 184c-13-21 15-28 1-49"/><path d="M419 187c-12-16 11-21 1-36"/></g>
      </svg>
      <p id="welcome-caption" className="welcome-caption">Todo empieza<br/><em>con un buen café.</em></p>
      <div className="welcome-finish-mark" aria-hidden="true"><i/><span>ANVID COFFE</span><i/></div>
    </div>
    <button className="welcome-skip" onClick={dismiss}>Saltar bienvenida <ArrowUpRight size={17} strokeWidth={1.3}/></button>
  </dialog>;
}
