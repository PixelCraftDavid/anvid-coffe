import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { formatPrizeTimestamp } from './prizeDateTime.js';

export default function CouponQr({play}) {
  const [image,setImage]=useState('');
  const [error,setError]=useState(false);
  useEffect(()=>{let active=true;QRCode.toDataURL(`ANVID:${play.code}`,{width:232,margin:4,errorCorrectionLevel:'M',color:{dark:'#26301f',light:'#f6f4ed'}}).then(url=>{if(active)setImage(url);},()=>{if(active)setError(true);});return()=>{active=false;};},[play.code]);
  if(play.redeemedAt){const date=formatPrizeTimestamp(play.redeemedAt);return <p className="coupon-used"><CheckCircle2 size={15}/> Canjeado{date?` · ${date.date}, ${date.time}`:''}</p>;}
  return <details className="coupon-qr"><summary><QrCode size={16}/> Mostrar QR para canjear</summary>{image?<img src={image} width="160" height="160" alt={`Código QR para canjear el cupón ${play.code}`}/>:<p>{error?'Puedes canjearlo mostrando el código escrito.':'Preparando tu QR…'}</p>}<p>Muéstralo al equipo de Anvid.<br/>Un solo uso, validado al entregar tu café.</p></details>;
}
