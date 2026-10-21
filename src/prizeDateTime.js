import { cafe } from './config.js';

export function formatPrizeTimestamp(value) {
  if(typeof value!=='string' || !Number.isFinite(Date.parse(value))) return null;
  const date=new Date(value);
  return {
    iso:date.toISOString(),
    date:new Intl.DateTimeFormat('es-MX',{timeZone:cafe.timeZone,dateStyle:'long'}).format(date),
    time:new Intl.DateTimeFormat('es-MX',{timeZone:cafe.timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(date),
    zone:cafe.timeZoneLabel,
  };
}
