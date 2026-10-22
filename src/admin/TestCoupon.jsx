import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {Download,RefreshCw,ArrowRight,Plus} from 'lucide-react';
import {adminRequest} from './api.js';

async function downloadQr(coupon) {
  const canvas=document.createElement('canvas');canvas.width=660;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#f6f4ed';ctx.fillRect(0,0,660,900);
  ctx.fillStyle='#26301f';ctx.textAlign='center';ctx.font='42px Georgia';ctx.fillText('anvid · prueba de QR',330,85);
  ctx.font='bold 23px sans-serif';ctx.fillText('PRUEBA · SIN VALOR DE CANJE',330,145);
  const qr=document.createElement('canvas');
  await QRCode.toCanvas(qr,`ANVID-TEST:${coupon.code}`,{width:380,margin:4,errorCorrectionLevel:'M',color:{dark:'#26301f',light:'#f6f4ed'}});
  ctx.drawImage(qr,140,205);ctx.font='bold 25px monospace';ctx.fillText(coupon.code,330,655);
  ctx.font='19px sans-serif';ctx.fillText('No entrega un café ni consume el premio del día.',330,720);
  ctx.fillText('Valídalo desde el panel privado de Anvid.',330,755);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));if(!blob)throw new Error('Image unavailable');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`prueba-qr-${coupon.code}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function TestCoupon({onInspect,onExpired}) {
  const [coupon,setCoupon]=useState(null),[image,setImage]=useState(''),[pending,setPending]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;setImage('');if(coupon)QRCode.toDataURL(`ANVID-TEST:${coupon.code}`,{width:240,margin:4,errorCorrectionLevel:'M',color:{dark:'#26301f',light:'#f6f4ed'}}).then(url=>{if(active)setImage(url);},()=>{if(active)setError('No pudimos dibujar el QR. Puedes validar el código escrito.');});return()=>{active=false;};},[coupon]);
  async function create(){if(pending)return;setPending(true);setError('');try{const result=await adminRequest(null,{action:'createTestCoupon'});setCoupon(result.coupon);}catch(error){if(error.status===401)onExpired();else setError(error.message);}finally{setPending(false);}}
  async function save(){if(saving)return;setSaving(true);try{await downloadQr(coupon);}catch{setError('No pudimos descargarlo. Puedes tomar una captura de este QR.');}finally{setSaving(false);}}
  return <div className="test-coupon-tool" id="prueba-qr"><p>Prueba el escaneo y el canje con un QR separado. No consume el premio diario ni suma cafés entregados.</p>{coupon&&<div className="test-coupon-preview"><strong>PRUEBA · SIN VALOR DE CANJE</strong>{image?<img src={image} width="180" height="180" alt={`QR de prueba ${coupon.code}`}/>:<span role="status">Preparando QR…</span>}<code>{coupon.code}</code><button className="admin-secondary" disabled={saving} onClick={save}><Download size={15}/>{saving?'Preparando…':'Guardar QR de prueba'}</button><button className="admin-text-button" onClick={()=>onInspect(coupon.code)}>Probar este canje <ArrowRight size={15}/></button><p>En este celular: guarda la imagen y ábrela en «Leer desde una imagen». Para usar la cámara, muestra el QR en otra pantalla.</p></div>}<button className="admin-secondary" disabled={pending} onClick={create}>{pending?<RefreshCw size={15} className="is-refreshing"/>:<Plus size={15}/>} {pending?'Creando prueba…':coupon?'Crear otro QR de prueba':'Crear QR de prueba'}</button>{error&&<p className="admin-error" role="alert">{error}</p>}</div>;
}
