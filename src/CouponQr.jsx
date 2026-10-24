import { QrCode, CheckCircle2 } from 'lucide-react';
import { formatPrizeTimestamp } from './prizeDateTime.js';
import QrCup from './QrCup.jsx';

export default function CouponQr({play}) {
  if(play.redeemedAt){const date=formatPrizeTimestamp(play.redeemedAt);return <p className="coupon-used"><CheckCircle2 size={15}/> Canjeado{date?` · ${date.date}, ${date.time}`:''}</p>;}
  return <details className="coupon-qr"><summary><QrCode size={16}/> Mostrar QR para canjear</summary><QrCup payload={`ANVID:${play.code}`} label={`QR del cupón ${play.code}`}/><p>Muéstralo al equipo de Anvid en vista plana.<br/>Un solo uso, validado al entregar tu café.</p></details>;
}
