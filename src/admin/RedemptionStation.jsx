import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {QrCode,Plus,Minus,Camera,Image as ImageIcon,Keyboard,ArrowRight,RefreshCw,AlertCircle,ShieldCheck,Check,Coffee,CheckCircle2,Upload} from 'lucide-react';
import CameraReader from './CameraReader.jsx';
import {adminRequest} from './api.js';

function Method({id,label,icon:Icon,active,onToggle,children,disabled}) {
  const reduce=useReducedMotion();
  return <motion.div layout className={`redemption-method ${active?'is-active':''}`} transition={{duration:reduce?0:.2,ease:[.23,1,.32,1]}}>
    <motion.button layout="position" className="method-trigger" onClick={onToggle} disabled={disabled} aria-expanded={active} aria-controls={`method-${id}`}><Icon size={16}/><span>{label}</span>{active?<Minus size={15}/>:<Plus size={15}/>}</motion.button>
    <AnimatePresence initial={false}>{active&&<motion.div id={`method-${id}`} className="method-content" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduce?0:.2,ease:[.23,1,.32,1]}}><div>{children}</div></motion.div>}</AnimatePresence>
  </motion.div>;
}

export default function RedemptionStation({selectedCode,onCodeHandled,onRedeemed,onExpired,dateText,Status}) {
  const [method,setMethod]=useState('code'),[code,setCode]=useState(''),[selected,setSelected]=useState(null),[working,setWorking]=useState(false),[reading,setReading]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const pending=useRef(false),mounted=useRef(true),fileInput=useRef(null),dialog=useRef(null),confirmButton=useRef(null),input=useRef(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  function expired(error){if(error.status===401){onExpired();return true;}return false;}
  async function inspect(value=code){if(pending.current)return;pending.current=true;setWorking(true);setError('');setSuccess('');setSelected(null);setMethod('code');try{const {coupon}=await adminRequest(null,{action:'inspect',code:value});if(mounted.current){setCode(coupon.code);setSelected(coupon);}}catch(error){if(!expired(error)&&mounted.current)setError(error.message);}finally{pending.current=false;if(mounted.current)setWorking(false);}}
  useEffect(()=>{if(selectedCode){setCode(selectedCode);inspect(selectedCode);onCodeHandled();}},[selectedCode]);
  async function readImage(event){const file=event.target.files?.[0];event.target.value='';if(!file||reading||working)return;if(file.size>10*1024*1024){setError('Elige una imagen de menos de 10 MB.');return;}setReading(true);setError('');const url=URL.createObjectURL(file);try{const {BrowserQRCodeReader}=await import('@zxing/browser');const result=await new BrowserQRCodeReader().decodeFromImageUrl(url);if(mounted.current)await inspect(result.getText());}catch{if(mounted.current)setError('No pudimos leer ese QR. Prueba con otra imagen o escribe el código.');}finally{URL.revokeObjectURL(url);if(mounted.current)setReading(false);}}
  async function redeem(){if(pending.current||!selected?.won||selected.redeemedAt)return;pending.current=true;setWorking(true);setError('');try{const {coupon}=await adminRequest(null,{action:'redeem',code:selected.code});if(mounted.current){setSelected(coupon);setSuccess('Canje registrado. Ahora sí: a disfrutar ese café.');onRedeemed();}}catch(error){if(!expired(error)&&mounted.current){setError(error.message);try{const latest=await adminRequest(null,{action:'inspect',code:selected.code});if(mounted.current)setSelected(latest.coupon);}catch{/* Keep the original error. */}}}finally{pending.current=false;dialog.current?.close();if(mounted.current)setWorking(false);}}
  const disabled=working||reading;
  const toggle=value=>{setMethod(current=>current===value?null:value);setError('');};
  return <section className="validation-panel" id="validar" aria-labelledby="validation-title">
    <div className="validation-heading"><span className="validation-symbol"><QrCode size={22}/></span><h2 id="validation-title">De la suerte<br/>a la barra.</h2></div><p className="validation-intro">Un cupón. Un café. Un solo canje.</p>
    <div className="redemption-methods">
      <Method id="code" label="Escribir código" icon={Keyboard} active={method==='code'} disabled={disabled} onToggle={()=>toggle('code')}><form onSubmit={event=>{event.preventDefault();inspect();}}><label htmlFor="coupon-code">Código del cupón</label><div className="coupon-input-wrap"><input ref={input} id="coupon-code" value={code} onChange={event=>{setCode(event.target.value);setSelected(null);setSuccess('');setError('');}} placeholder="ANV-…" maxLength={180} autoComplete="off" autoCapitalize="characters" spellCheck="false" disabled={disabled}/><button type="submit" disabled={disabled||!code.trim()} aria-label="Comprobar cupón">{working?<RefreshCw size={17} className="is-refreshing"/>:<ArrowRight size={18}/>}</button></div></form></Method>
      <Method id="camera" label="Escanear QR" icon={Camera} active={method==='camera'} disabled={disabled} onToggle={()=>toggle('camera')}>{method==='camera'&&<CameraReader onCode={value=>{setCode(value);inspect(value);}} onClose={()=>setMethod('code')}/>}</Method>
      <Method id="image" label="Leer desde una imagen" icon={ImageIcon} active={method==='image'} disabled={disabled} onToggle={()=>toggle('image')}><p>Elige la foto o captura del cupón. Se lee en este dispositivo.</p><button className="admin-secondary" disabled={disabled} onClick={()=>fileInput.current?.click()}><Upload size={16}/>{reading?'Leyendo el QR…':'Elegir imagen del QR'}</button></Method>
      <input ref={fileInput} className="visually-hidden" tabIndex={-1} type="file" accept="image/*" onChange={readImage}/>
    </div>
    {reading&&<p className="image-reading" role="status"><RefreshCw size={14} className="is-refreshing"/> Leyendo el código de la imagen…</p>}
    {error&&<p className="admin-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {selected&&<div className={`validated-coupon ${selected.redeemedAt?'is-used':''}`} aria-live="polite"><Status coupon={selected}/><h3>{selected.won?'Un café de cortesía.':'Esta tarjeta no tiene premio.'}</h3><span className="validated-code">{selected.code}</span><dl><div><dt>Emitido</dt><dd>{dateText(selected.createdAt)}</dd></div>{selected.redeemedAt&&<div><dt>Canjeado</dt><dd>{dateText(selected.redeemedAt)}</dd></div>}</dl>{selected.won&&!selected.redeemedAt&&<button className="admin-primary" disabled={disabled} onClick={()=>{dialog.current.showModal();confirmButton.current?.focus();}}>Marcar como canjeado <Check size={17}/></button>}{selected.redeemedAt&&<p className="already-used-note">Este cupón ya fue utilizado.</p>}</div>}
    {success&&<p className="redemption-success" role="status"><CheckCircle2 size={18}/>{success}</p>}
    {!selected&&!error&&<div className="validator-empty"><ShieldCheck size={17}/><p>Siempre validado en el servidor.<br/>Las copias del QR no permiten otro canje.</p></div>}
    <dialog ref={dialog} className="redemption-dialog" onCancel={event=>{if(working)event.preventDefault();}}><span className="confirmation-icon"><Coffee size={25}/></span><h2>¿Entregar este café?</h2><p>El cupón <strong>{selected?.code}</strong> quedará canjeado y no podrá utilizarse otra vez.</p><button ref={confirmButton} className="admin-primary" disabled={working} onClick={redeem}>{working?'Registrando canje…':'Confirmar entrega'}<Check size={18}/></button><button className="admin-text-button" disabled={working} onClick={()=>dialog.current.close()}>Volver sin canjear</button></dialog>
  </section>;
}
