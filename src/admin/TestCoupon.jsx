import {useState} from 'react';
import {createQrCanvas} from '../qrTexture.js';
import {Download,RefreshCw,ArrowRight,Plus} from 'lucide-react';
import {adminRequest} from './api.js';
import QrCup from '../QrCup.jsx';

async function downloadQr(coupon) {
  const canvas=document.createElement('canvas');canvas.width=660;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#f6f4ed';ctx.fillRect(0,0,660,900);
  ctx.fillStyle='#26301f';ctx.textAlign='center';ctx.font='42px Georgia';ctx.fillText('anvid · prueba de QR',330,85);
  ctx.font='bold 23px sans-serif';ctx.fillText('PRUEBA · SIN VALOR DE CANJE',330,145);
  const qr=createQrCanvas(`ANVID-TEST:${coupon.code}`).canvas;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,140,205,380,380);ctx.font='bold 25px monospace';ctx.fillText(coupon.code,330,655);
  ctx.font='19px sans-serif';ctx.fillText('No entrega un café ni consume el premio del día.',330,720);
  ctx.fillText('Valídalo desde el panel privado de Anvid.',330,755);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));if(!blob)throw new Error('Image unavailable');
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`prueba-qr-${coupon.code}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function TestCoupon({onInspect,onExpired,showcase=false}) {
  const [coupon,setCoupon]=useState(null),[pending,setPending]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  async function create(){if(pending)return;setPending(true);setError('');try{const result=await adminRequest(null,{action:'createTestCoupon'});setCoupon(result.coupon);}catch(error){if(error.status===401)onExpired();else setError(error.message);}finally{setPending(false);}}
  async function save(){if(saving)return;setSaving(true);try{await downloadQr(coupon);}catch{setError('No pudimos descargarlo. Puedes tomar una captura de este QR.');}finally{setSaving(false);}}
  return <section className={`test-coupon-tool ${showcase?'qr-showcase surface':''}`} id="prueba-qr">{showcase&&<><h2>Un QR.<br/><em>Otra dimensión.</em></h2><p>Desde arriba, un código. Al tocarlo, una taza cuadrada hecha de píxeles.</p><QrCup payload={coupon?`ANVID-TEST:${coupon.code}`:'ANVID:VISTA-DE-DISENO'} label={coupon?'QR de canje de prueba':'Ejemplo visual de QR'}/></>}<p>{coupon?'Este QR permite simular el canje, sin gastar premios.':'Ejemplo visual sin valor de canje. Crea un QR TEST para probar también su validación.'}</p>{coupon&&<div className="test-coupon-preview"><strong>PRUEBA · SIN VALOR DE CANJE</strong>{!showcase&&<QrCup payload={`ANVID-TEST:${coupon.code}`} label="QR de canje de prueba"/>}<code>{coupon.code}</code><button className="admin-secondary" disabled={saving} onClick={save}><Download size={15}/>{saving?'Preparando…':'Guardar QR de prueba'}</button><button className="admin-text-button" onClick={()=>onInspect(coupon.code)}>Probar este canje <ArrowRight size={15}/></button><p>Guarda el QR plano para leerlo desde una imagen o muéstralo en otra pantalla para probar la cámara.</p></div>}<button className="admin-secondary" disabled={pending} onClick={create}>{pending?<RefreshCw size={15} className="is-refreshing"/>:<Plus size={15}/>} {pending?'Creando prueba…':coupon?'Crear otro QR de prueba':'Crear QR de prueba'}</button>{error&&<p className="admin-error" role="alert">{error}</p>}</section>;
}
