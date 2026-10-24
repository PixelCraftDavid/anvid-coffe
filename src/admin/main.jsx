import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Coffee,ArrowUpRight,ArrowRight,LockKeyhole,AlertCircle,ShieldCheck} from 'lucide-react';
import {adminRequest} from './api.js';
import Dashboard from './Dashboard.jsx';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './panel.css';
import './dashboard.css';
import './workspace.css';

function AmbientWave(){
  const root=useRef(null);
  useEffect(()=>{const update=()=>{if(root.current)root.current.dataset.paused=String(document.hidden);document.documentElement.dataset.motionPaused=String(document.hidden);};document.addEventListener('visibilitychange',update);update();return()=>document.removeEventListener('visibilitychange',update);},[]);
  return <div className="dashboard-backdrop" ref={root} aria-hidden="true"><div className="wave-field wave-field-one"/><div className="wave-field wave-field-two"/><div className="wave-texture"/></div>;
}

function Login({onLogin,error:initialError,checking}) {
  const [password,setPassword]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
  const submitting=useRef(false);
  async function submit(event){event.preventDefault();if(submitting.current)return;submitting.current=true;setPending(true);setError('');try{const session=await adminRequest(null,{action:'login',password});setPassword('');onLogin(session);}catch(error){setError(error.message);}finally{submitting.current=false;setPending(false);}}
  return <><AmbientWave/><main className="admin-login"><section className="login-story"><a className="admin-wordmark" href="/">anvid<span>LA BARRA</span></a><div><Coffee size={50} strokeWidth={1}/><h1>Tu café.<br/><em>Una nueva mirada.</em></h1><p>Ventas, opiniones y pequeños premios.<br/>El pulso de Anvid, en un solo lugar.</p></div><span className="login-story-footer">IXMIQUILPAN · UTVM & CENTRO</span></section><section className="login-entry"><div className="login-form-wrap"><LockKeyhole size={22} strokeWidth={1.4}/><h2>Tu turno<br/><em>en la barra.</em></h2><p>Entra para registrar ventas y cuidar cada canje.</p>{checking?<p role="status">Comprobando tu sesión…</p>:<form onSubmit={submit}><label htmlFor="admin-password">Contraseña privada</label><input id="admin-password" type="password" name="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event=>setPassword(event.target.value)} disabled={pending}/><button className="admin-primary" disabled={pending}>{pending?'Entrando…':'Entrar al panel'}<ArrowRight size={18}/></button>{(error||initialError)&&<p className="admin-error" role="alert"><AlertCircle size={16}/>{error||initialError}</p>}</form>}<div className="login-privacy"><ShieldCheck size={16}/><p>Acceso protegido. La contraseña se verifica en el servidor.</p></div><a href="/" className="admin-text-button">Volver al café <ArrowUpRight size={14}/></a></div></section></main></>;
}

function AdminApp(){
  const [phase,setPhase]=useState('checking'),[session,setSession]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;adminRequest({view:'session'}).then(value=>{if(active){setSession(value);setPhase('ready');}},error=>{if(active){setPhase('guest');if(error.status!==401)setError(error.message);}});return()=>{active=false;};},[]);
  if(phase!=='ready')return <Login checking={phase==='checking'} error={error} onLogin={value=>{setSession(value);setPhase('ready');setError('');}}/>;
  return <Dashboard session={session} onExpired={()=>{setSession(null);setPhase('guest');setError('Tu sesión terminó. Vuelve a entrar.');}} onLogout={()=>{setSession(null);setPhase('guest');setError('');}}><AmbientWave/></Dashboard>;
}
const root=import.meta.hot?.data.root||createRoot(document.getElementById('root'));
if(import.meta.hot)import.meta.hot.data.root=root;
root.render(<AdminApp/>);
