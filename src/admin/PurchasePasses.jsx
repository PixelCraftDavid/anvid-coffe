import {useEffect,useRef,useState} from 'react';
import {Copy,Check,Download,ArrowUpRight} from 'lucide-react';
import {createQrCanvas} from '../qrTexture.js';
import QrCup from '../QrCup.jsx';
import {adminRequest} from './api.js';

export const playPassLink=token=>`${location.origin}/#p=${token}`;
export default function PurchasePasses({passes:initialPasses,saleId,revision,onExpired}){
  const [current,setCurrent]=useState(initialPasses),seen=useRef(revision);
  useEffect(()=>setCurrent(initialPasses),[initialPasses]);
  useEffect(()=>{if(!saleId||seen.current===revision)return;seen.current=revision;let active=true;adminRequest({view:'passes',saleId}).then(result=>{if(active)setCurrent(result.passes);},error=>{if(active){if(error.status===401)onExpired?.();else setError(error.message);}});return()=>{active=false;};},[saleId,revision]);
  const [index,setIndex]=useState(0),[copied,setCopied]=useState(false),[error,setError]=useState('');
  const passes=current,pass=passes[Math.min(index,passes.length-1)];
  if(!pass)return <p className="passes-note">Esta venta anterior no tiene pases de participación.</p>;
  const url=playPassLink(pass.token),available=pass.status==='available';
  async function save(){try{const image=createQrCanvas(url,12).canvas.toDataURL('image/png');const a=document.createElement('a');a.href=image;a.download=`anvid-pase-${pass.ordinal}.png`;a.click();}catch{setError('No pudimos guardar el QR. Puedes copiar el enlace.');}}
  return <div className="purchase-passes"><div className="passes-heading"><h3>El pase de su café.</h3><span>{available?'Disponible':pass.status==='used'?'Ya utilizado':'Compra anulada'}</span></div><p>Entrega un QR por café comprado. Cada uno abre un solo intento.</p>{passes.length>1&&<label>Seleccionar pase<select value={Math.min(index,passes.length-1)} onChange={event=>{setIndex(Number(event.target.value));setCopied(false);setError('');}}>{passes.map((item,i)=><option key={item.token} value={i}>Pase {item.ordinal} de {passes.length} · {item.status==='available'?'disponible':item.status==='used'?'utilizado':'anulado'}</option>)}</select></label>}{available?<><QrCup payload={url} label={`QR de participación ${pass.ordinal}`}/><div className="pass-actions"><button type="button" className="admin-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('No pudimos copiarlo. Muestra el QR directamente.');}}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Enlace copiado':'Copiar enlace'}</button><button type="button" className="admin-secondary" onClick={save}><Download size={15}/>Guardar QR plano</button></div><a href={url} target="_blank" rel="noreferrer" className="admin-text-button">Abrir el pase <ArrowUpRight size={15}/></a><p className="passes-note">Ábrelo solo para revisar. El intento se utiliza al revelar el resultado. Comparte este pase únicamente con el comprador.</p></>:<p className="passes-note">Este pase no puede iniciar otro juego. Los premios ya emitidos conservan su estado.</p>}{error&&<p className="admin-error" role="alert">{error}</p>}</div>;
}
