import {useEffect,useRef,useState} from 'react';
import {Search,Check,ArrowRight,Download,MapPin,X,Users,Receipt} from 'lucide-react';
import {adminRequest} from './api.js';
import QrCup from '../QrCup.jsx';
import {createQrCanvas} from '../qrTexture.js';
import {printedGameUrl,displayRequestCode} from '../../shared/playAccessConfig.js';
import {saleDefaults,saleLocations} from '../../shared/salesConfig.js';
import {money} from './salesModel.js';

export async function downloadCounterQr(){
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1120;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#fff8e9';ctx.fillRect(0,0,800,1120);ctx.fillStyle='#183d2b';ctx.textAlign='center';
  ctx.font='78px Georgia';ctx.fillText('anvid coffe',400,125);
  ctx.font='29px sans-serif';ctx.fillText('Tu café trae una oportunidad.',400,202);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(createQrCanvas(printedGameUrl,12).canvas,130,260,540,540);
  ctx.font='bold 28px sans-serif';ctx.fillText('Escanea después de comprar',400,868);
  ctx.font='23px sans-serif';ctx.fillText('Muestra tu identificador al equipo.',400,922);ctx.fillText('Autorizamos tu compra y se abre tu juego.',400,958);
  ctx.font='18px sans-serif';ctx.fillText('anvid-coffe.vercel.app',400,1050);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));if(!blob)throw new Error('Image unavailable');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='anvid-qr-para-imprimir.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function PlayAccessDesk({waiting,sales,revision,onChanged,onExpired}){
  const [query,setQuery]=useState(''),[found,setFound]=useState(null),[selected,setSelected]=useState(null),[locationId,setLocationId]=useState('utvm'),[existing,setExisting]=useState(false),[saleId,setSaleId]=useState('');
  const [busy,setBusy]=useState(false),[searching,setSearching]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const request=useRef(null),pending=useRef(false),searchVersion=useRef(0),mounted=useRef(true),lastRevision=useRef(revision),searchValue=useRef('');
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;searchVersion.current++;};},[]);
  async function search(value=query){
    const generation=++searchVersion.current;searchValue.current=value;setSearching(true);setError('');
    try{const result=await adminRequest({view:'requests',code:value});if(mounted.current&&generation===searchVersion.current)setFound(result);}catch(error){if(mounted.current&&generation===searchVersion.current){if(error.status===401)onExpired();else setError(error.message);}}finally{if(mounted.current&&generation===searchVersion.current)setSearching(false);}
  }
  useEffect(()=>{if(lastRevision.current!==revision){lastRevision.current=revision;if(searchValue.current)search(searchValue.current);}},[revision]);
  const rows=(found||waiting)?.items||[],recent=sales?.recentSales.filter(sale=>!sale.voidedAt)||[];
  const selectedRow=rows.find(row=>row.code===selected),eligible=selectedRow?.status==='pending'&&Date.parse(selectedRow.expiresAt)>Date.now();
  async function authorize(){
    if(pending.current||!eligible||existing&&!saleId)return;
    const fingerprint=JSON.stringify({selected,existing,saleId,locationId});if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
    pending.current=true;setBusy(true);setError('');setSuccess('');
    try{
      await adminRequest(null,existing?{action:'authorizeExistingSale',requestCode:selected,saleId}:{action:'authorizePlay',requestCode:selected,requestId:request.current.id,locationId});
      if(mounted.current){setSuccess(`${displayRequestCode(selected)} autorizado. ${existing?'La venta no se volvió a sumar.':'Venta registrada.'} La tarjeta del cliente se abrirá automáticamente.`);setSelected(null);setFound(null);setQuery('');searchValue.current='';request.current=null;}
      onChanged();
    }catch(error){if(mounted.current){if(error.status===401)onExpired();else setError(error.message);}}finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  async function dismiss(code){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await adminRequest(null,{action:'dismissPlayRequest',requestCode:code});if(mounted.current){setSelected(null);setFound(null);setQuery('');searchValue.current='';setSuccess('Solicitud cerrada. No se registró ninguna venta.');}onChanged();}catch(error){if(error.status===401)onExpired();else if(mounted.current)setError(error.message);}finally{pending.current=false;if(mounted.current)setBusy(false);}}
  return <div className="play-access-workbench">
    <section className="play-access-queue surface" aria-labelledby="authorize-title"><div className="access-heading"><div><h2 id="authorize-title">De su café,<br/><em>a su juego.</em></h2><p>Después de cobrar, compara el identificador de su pantalla y autoriza su intento.</p></div><span className="queue-count"><Users size={18}/>{waiting?.items.length||0} en espera</span></div>
      <form className="request-search" onSubmit={event=>{event.preventDefault();search();}}><label htmlFor="request-search-code">Identificador del cliente</label><div><input id="request-search-code" value={query} onChange={event=>setQuery(event.target.value)} placeholder="ABC-123" autoComplete="off" autoCapitalize="characters" spellCheck="false" maxLength={12} disabled={busy}/><button className="admin-icon-button" disabled={busy||searching||!query.trim()} aria-label="Buscar identificador"><Search size={18}/></button></div></form>
      {found&&<button type="button" className="admin-text-button" onClick={()=>{searchVersion.current++;searchValue.current='';setFound(null);setQuery('');setSelected(null);}}>Ver solicitudes pendientes</button>}
      <div className="waiting-list" aria-label="Clientes esperando autorización">{rows.map(row=><div className={`waiting-row ${selected===row.code?'is-selected':''}`} key={row.code}><button type="button" disabled={busy||row.status!=='pending'||Date.parse(row.expiresAt)<=Date.now()} onClick={()=>{setSelected(row.code);setSuccess('');setError('');}} aria-pressed={selected===row.code}><span>{displayRequestCode(row.code)}</span><small>{row.status==='pending'?'Esperando autorización':row.status==='approved'?'Ya autorizado':row.status==='used'?'Ya jugó':row.status==='expired'?'Identificador caducado':'Solicitud cerrada'}</small><ArrowRight size={16}/></button>{row.status==='pending'&&<button type="button" className="admin-icon-button" disabled={busy} onClick={()=>dismiss(row.code)} aria-label={`Descartar solicitud ${displayRequestCode(row.code)}`}><X size={15}/></button>}</div>)}</div>
      {!rows.length&&<div className="access-empty"><CoffeePlaceholder/><p>{found?'No encontramos ese identificador. Comprueba la pantalla del cliente.':'Cuando escaneen tu QR, su identificador aparecerá aquí automáticamente.'}</p></div>}
      {waiting?.hasMore&&!found&&<p className="access-note">Se muestran 30 solicitudes recientes. Puedes buscar cualquier identificador arriba.</p>}
      {selected&&<div className="access-confirm"><div className="access-confirm-title"><Check size={18}/><strong>Autorizar {displayRequestCode(selected)}</strong></div><p>{eligible?'Confirma que este es el identificador del cliente que acaba de pagar.':'Esta solicitud ya fue atendida o caducó. Revisa el identificador actual del cliente.'}</p><div className="location-pills">{saleLocations.map(place=><button type="button" key={place.id} disabled={busy||existing} aria-pressed={locationId===place.id} onClick={()=>setLocationId(place.id)}><MapPin size={14}/>{place.name}</button>)}</div><label className="already-recorded"><input type="checkbox" checked={existing} disabled={busy} onChange={event=>setExisting(event.target.checked)}/>Ya registré esta venta</label>{existing?<label className="existing-sale-label">Venta ya registrada<select value={saleId} onChange={event=>setSaleId(event.target.value)} disabled={busy}><option value="">Selecciona la venta del cliente</option>{recent.map(sale=><option key={sale.id} value={sale.id}>{saleLocations.find(place=>place.id===sale.locationId)?.name} · {sale.quantity} {sale.quantity===1?'café':'cafés'} · {money(sale.revenueCents)} · {new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Etc/GMT+6'}).format(new Date(sale.createdAt))}</option>)}</select></label>:<p className="access-sale-summary"><Receipt size={15}/>1 café · {money(saleDefaults.unitPriceCents)} MXN</p>}<button type="button" className="admin-primary" disabled={busy||!eligible||existing&&!saleId} onClick={authorize}>{busy?'Autorizando…':existing?'Autorizar con esta venta':'Registrar venta y autorizar'}<ArrowRight size={17}/></button><p className="access-note">{existing?'Utiliza un intento pendiente de esa venta, sin sumar otro ingreso.':'Registra una venta de un café y activa un intento. No registres la misma venta otra vez abajo.'}</p></div>}
      {success&&<p className="access-success" role="status"><Check size={17}/>{success}</p>}{error&&<p className="admin-error" role="alert">{error}</p>}
    </section>
    <section className="counter-qr surface"><h2>Un QR para<br/><em>tu mostrador.</em></h2><p>Imprímelo una vez. Todos entran aquí y tú autorizas cada compra.</p><QrCup payload={printedGameUrl} label="QR fijo del mostrador"/><button type="button" className="admin-secondary" disabled={saving} onClick={async()=>{setSaving(true);setError('');try{await downloadCounterQr();}catch{setError('No pudimos descargar la imagen. Vuelve a intentarlo.');}finally{if(mounted.current)setSaving(false);}}}><Download size={16}/>{saving?'Preparando…':'Descargar para imprimir'}</button><small>Este QR abre la página publicada de Anvid.<br/>No incluye el enlace del panel privado.</small></section>
  </div>;
}
function CoffeePlaceholder(){return <Users size={25} strokeWidth={1.3}/>;}
