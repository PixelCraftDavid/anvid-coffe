import { CalendarDays } from 'lucide-react';
import { formatPrizeTimestamp } from './prizeDateTime.js';

export default function PrizeTimestamp({ value }) {
  const timestamp=formatPrizeTimestamp(value);
  if(!timestamp) return <span className="prize-timestamp timestamp-unavailable">Fecha no registrada · pase anterior</span>;
  return <time className="prize-timestamp" dateTime={timestamp.iso}>
    <CalendarDays size={14} strokeWidth={1.3}/>
    <span><strong>Ganado el {timestamp.date}</strong><small>{timestamp.time} · {timestamp.zone}</small></span>
  </time>;
}
