import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowUp, Check, Plus, Minus, MapPin, TrendingUp, Receipt, RotateCcw, AlertCircle, Coffee } from 'lucide-react';
import { saleDefaults, saleLocations } from '../../shared/salesConfig.js';
import { adminRequest } from './api.js';
import { money, periodSales, chartGeometry, tilePoint } from './salesModel.js';

const shortDate = day => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
const newRequestId = () => crypto.randomUUID();

export function SaleEntry({ onRecorded, onExpired }) {
  const [locationId, setLocationId] = useState('utvm'), [quantity, setQuantity] = useState(1), [price, setPrice] = useState('30.00'), [cost, setCost] = useState('9.95'), [pending, setPending] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
  const request = useRef(null), busy = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const input = { locationId, quantity: Number(quantity), unitPriceCents: Math.round(Number(price) * 100), unitCostCents: Math.round(Number(cost) * 100) };
  const valid = Number.isInteger(input.quantity) && input.quantity > 0 && input.quantity <= 100 && price !== '' && cost !== '' && [input.unitPriceCents, input.unitCostCents].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000);
  async function submit(event) {
    event.preventDefault(); if (busy.current || !valid) return;
    const fingerprint = JSON.stringify(input);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: newRequestId() };
    busy.current = true; setPending(true); setError(''); setSaved('');
    try {
      const result = await adminRequest(null, { action: 'recordSale', requestId: request.current.id, ...input });
      if (mounted.current) { request.current = null; setSaved(`${result.sale.quantity} ${result.sale.quantity === 1 ? 'café registrado' : 'cafés registrados'} en ${saleLocations.find(value => value.id === locationId).name}.`); setQuantity(1); onRecorded(); }
    } catch (error) { if (mounted.current) { if (error.status === 401) onExpired(); else setError(error.message); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  return <section className="sale-entry" id="registrar" aria-labelledby="sale-entry-title">
    <div className="sale-entry-heading"><h2 id="sale-entry-title">Un café más.</h2><Coffee size={22} strokeWidth={1.4}/></div>
    <p>Registra lo que acabas de vender.</p>
    <form onSubmit={submit}>
      <fieldset disabled={pending}><legend>Punto de venta</legend><div className="location-pills">{saleLocations.map(value => <button type="button" key={value.id} aria-pressed={locationId === value.id} onClick={() => { setLocationId(value.id); setSaved(''); }}><MapPin size={14}/>{value.name}</button>)}</div></fieldset>
      <div className="sale-quantity-row"><label htmlFor="sale-quantity">¿Cuántos cafés?</label><div className="quantity-control"><button type="button" disabled={pending || Number(quantity) <= 1} onClick={() => setQuantity(value => Math.max(1, Number(value) - 1))} aria-label="Un café menos"><Minus size={15}/></button><input id="sale-quantity" aria-label="Cantidad de cafés" type="number" inputMode="numeric" min="1" max="100" required value={quantity} onChange={event => setQuantity(event.target.value)} disabled={pending}/><button type="button" disabled={pending || Number(quantity) >= 100} onClick={() => setQuantity(value => Math.min(100, Number(value) + 1))} aria-label="Un café más"><Plus size={15}/></button></div></div>
      <details className="sale-unit-details"><summary>Precio {money(input.unitPriceCents)} · costo {money(input.unitCostCents)} <span>Editar</span></summary><div><label>Precio por café<input type="number" inputMode="decimal" min="0" max="10000" step="0.01" required value={price} disabled={pending} onChange={event => setPrice(event.target.value)}/></label><label>Costo por café<input type="number" inputMode="decimal" min="0" max="10000" step="0.01" required value={cost} disabled={pending} onChange={event => setCost(event.target.value)}/></label></div></details>
      <div className="sale-total"><span>Total de la venta <small>MXN</small></span><strong>{money(valid ? input.unitPriceCents * input.quantity : 0)}</strong></div>
      {saved?<button key="new-sale" type="button" className="admin-primary" onClick={event=>{event.preventDefault();setSaved('');}}>Nueva venta<Plus size={19}/></button>:<button key="record-sale" type="submit" className="admin-primary" disabled={pending || !valid}>{pending ? 'Guardando venta…' : 'Registrar venta'}<ArrowUpRight size={19}/></button>}
      {saved && <p className="sale-saved" role="status"><Check size={16}/>{saved}</p>}{error && <p className="admin-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    </form>
  </section>;
}

export function FinancialOverview({ sales, summary, loading }) {
  const today = sales?.today;
  return <section className="financial-overview" aria-labelledby="overview-title"><div className="overview-top"><h2 id="overview-title">Tu día, en una mirada.</h2><span className="live-state"><i/>{loading ? 'Actualizando' : 'Hoy · MXN'}</span></div>
    <div className="income-block"><span>Ingresos registrados</span><strong>{today ? money(today.revenueCents) : '—'}</strong><p>{today ? `${today.quantity} ${today.quantity === 1 ? 'café vendido' : 'cafés vendidos'}` : 'Consultando tus ventas'}</p></div>
    <div className="financial-details"><div><span>Costo de preparación</span><strong>{today ? money(today.costCents) : '—'}</strong></div><div><span>Utilidad estimada</span><strong>{today ? money(today.profitCents) : '—'}</strong></div></div>
    <p className="margin-note">Precio base {money(saleDefaults.unitPriceCents)} · costo aprox. {money(saleDefaults.unitCostCents)} por café. Utilidad antes de otros gastos y cortesías.</p>
    <div className="overview-coupon-line"><span><Receipt size={14}/>{summary?.today ?? '—'} tarjetas de hoy</span><span><Coffee size={14}/>{summary?.redeemed ?? '—'} premios canjeados</span></div>
    <img className="overview-cup" src="/images/anvid-cup.webp" alt="" aria-hidden="true" width="210" height="300"/>
  </section>;
}

export function SalesChart({ sales, period, onPeriod, loading }) {
  const [metric, setMetric] = useState('revenueCents'), [selected, setSelected] = useState(null), id = useId().replace(/:/g, '');
  const report = useMemo(() => periodSales(sales?.days, period), [sales, period]);
  const chart = chartGeometry(report.rows, metric), current = chart.points[Math.min(selected ?? chart.points.length - 1, chart.points.length - 1)];
  return <section className="sales-chart surface" id="ventas" aria-labelledby="sales-chart-title"><div className="section-heading"><div><h2 id="sales-chart-title">El ritmo de tus ventas.</h2><p>Solo ventas registradas. Sin estimar a partir de raspados.</p></div><div className="period-switch" aria-label="Periodo de ventas">{[7, 30, 90].map(value => <button key={value} aria-pressed={period === value} onClick={() => { onPeriod(value); setSelected(null); }}>{value} días</button>)}</div></div>
    <div className="chart-summary"><strong>{sales ? money(report.totals[metric]) : '—'}</strong><div className="chart-metric-switch">{[['revenueCents', 'Ingresos'], ['profitCents', 'Utilidad']].map(([value, label]) => <button key={value} aria-pressed={metric === value} onClick={() => setMetric(value)}>{label}</button>)}</div></div>
    {sales ? <><div className="sales-chart-plot"><svg viewBox="0 0 610 235" role="img" aria-label={`${metric === 'revenueCents' ? 'Ingresos' : 'Utilidad estimada'} en ${period} días: ${money(report.totals[metric])}.`}><defs><linearGradient id={`sales-fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8560" stopOpacity=".22"/><stop offset="1" stopColor="#4f8560" stopOpacity="0"/></linearGradient></defs>{[22, 108, 196].map((y, i) => <g key={y}><line x1="40" x2="576" y1={y} y2={y} className="chart-grid"/><text x="0" y={y + 4} className="chart-axis">{i === 0 ? `$${chart.max / 100}` : i === 2 && chart.baseline === 196 ? '$0' : ''}</text></g>)}{chart.points.length > 0 && <><path d={`${chart.path} L576,${chart.baseline} L40,${chart.baseline} Z`} fill={`url(#sales-fill-${id})`}/><path d={chart.path} className="sales-line" pathLength="1"/>{current && <g><line x1={current.x} x2={current.x} y1="22" y2="196" className="chart-selection-line"/><circle cx={current.x} cy={current.y} r="5" className="chart-point"/></g>}{chart.points.filter((_, i) => i === 0 || i === Math.floor((chart.points.length - 1) / 2) || i === chart.points.length - 1).map(point => <text key={point.day} x={point.x} y="225" textAnchor="middle" className="chart-axis">{shortDate(point.day)}</text>)}</>}</svg></div>
      <div className="chart-day-control"><label htmlFor={`sales-day-${id}`}>Consultar día</label><input id={`sales-day-${id}`} type="range" min="0" max={Math.max(0, chart.points.length - 1)} value={selected ?? chart.points.length - 1} onChange={event => setSelected(Number(event.target.value))}/><output>{current ? `${shortDate(current.day)} · ${money(current[metric])}` : '—'}</output></div>
      <div className="chart-footnote"><span><TrendingUp size={14}/>{report.totals.quantity} cafés · {report.totals.orders} ventas</span><span>Utilidad estimada, antes de otros gastos.</span></div>{report.totals.orders === 0 && <p className="chart-empty-note">Registra tu primera venta para empezar a dibujar la historia.</p>}</> : <div className="panel-skeleton" role="status">{loading ? 'Preparando la gráfica…' : 'No pudimos cargar las ventas. Usa Actualizar panel.'}</div>}
  </section>;
}

const mapZoom = 13, mapCenter = tilePoint(20.4903, -99.2015, mapZoom), mapOrigin = { x: mapCenter.x - 330, y: mapCenter.y - 175 };
export function LocationMap({ sales, period }) {
  const [selected, setSelected] = useState('utvm'), [map, setMap] = useState(null), [failed, setFailed] = useState(false);
  useEffect(()=>{const controller=new AbortController();fetch('/maps/ixmiquilpan.json',{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('map');return response.json();}).then(data=>{setMap(data.paths);setFailed(false);}).catch(error=>{if(error.name!=='AbortError')setFailed(true);});return()=>controller.abort();},[]);
  const report = periodSales(sales?.days, period), locations = sales?.locations || saleLocations, max = Math.max(1, ...locations.map(value => report.byLocation[value.id]?.quantity || 0));
  const sorted = [...locations].sort((a, b) => (report.byLocation[b.id]?.quantity || 0) - (report.byLocation[a.id]?.quantity || 0)), leader = sorted[0], current = locations.find(value => value.id === selected) || locations[0], value = report.byLocation[current.id];
  return <section className="sales-location surface" aria-labelledby="location-title"><div className="section-heading"><div><h2 id="location-title">Dónde florece Anvid.</h2><p>Ixmiquilpan, Hidalgo · últimos {period} días</p></div><MapPin size={22} strokeWidth={1.4}/></div>
    <div className={`location-map ${failed ? 'map-unavailable' : ''}`}>
      <svg viewBox="0 0 660 350" aria-label="Zonas de venta: UTVM y centro de Ixmiquilpan" role="img">
        <rect width="660" height="350" fill="#e7eadb"/>
        {map&&<g className="local-map-traces"><path d={map.parks} className="local-map-parks"/><path d={map.water} className="local-map-water"/><path d={map.minor} className="local-map-minor"/><path d={map.major} className="local-map-major-edge"/><path d={map.major} className="local-map-major"/></g>}
        {locations.map(location=>{
          const point=tilePoint(location.lat,location.lng,mapZoom),x=point.x-mapOrigin.x,y=point.y-mapOrigin.y,quantity=report.byLocation[location.id]?.quantity||0,radius=quantity?17+quantity/max*13:15;
          return <g key={location.id} className={`location-pin ${location.id===selected?'is-selected':''}`}><circle cx={x} cy={y} r={radius+10} className="location-pin-area"/><circle cx={x} cy={y} r={radius} className="location-pin-dot"/><text x={x} y={y+5} textAnchor="middle" className="location-pin-value">{sales?quantity:'—'}</text><text x={x} y={y+radius+27} textAnchor="middle" className="location-pin-label">{location.name}</text></g>;
        })}
      </svg>
      <span className="map-north" aria-hidden="true">N <ArrowUp size={13}/></span><a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap · ODbL</a>
    </div>
    <div className="location-ranking" aria-label="Ventas por zona">{locations.map(location => { const quantity = report.byLocation[location.id]?.quantity || 0; return <button key={location.id} aria-pressed={selected === location.id} onClick={() => setSelected(location.id)}><span><i/>{location.name}</span><strong>{sales?quantity:'—'} <small>cafés</small></strong></button>; })}</div>
    <p className="location-detail"><MapPin size={14}/><span>{sales?<>{current.name}: <strong>{money(value?.revenueCents)}</strong> en ingresos.{report.totals.quantity > 0 ? ` ${leader.name} ${report.byLocation.utvm?.quantity === report.byLocation.centro?.quantity ? 'comparte el primer lugar.' : 'registra más cafés vendidos.'}` : ' Aún no hay ventas registradas.'}</>:'Las ventas por zona aparecerán al conectar con la barra.'}</span></p><p className="location-reference-note">Zonas de referencia, no ubicaciones de clientes.{failed ? ' El fondo cartográfico no está disponible; los totales siguen funcionando.' : ''}</p>
  </section>;
}

export function SalesHistory({ sales, onChanged, onExpired, dateText }) {
  const [chosen, setChosen] = useState(null), [pending, setPending] = useState(false), [error, setError] = useState('');
  const dialog = useRef(null), cancel = useRef(null), trigger = useRef(null), busy = useRef(false);
  async function voidRecord() {
    if (busy.current || !chosen) return; busy.current = true; setPending(true); setError('');
    try { await adminRequest(null, { action: 'voidSale', saleId: chosen.id }); dialog.current.close(); setChosen(null); onChanged(); }
    catch (error) { if (error.status === 401) onExpired(); else setError(error.message); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className="sales-history surface" aria-labelledby="sales-history-title"><div className="section-heading"><div><h2 id="sales-history-title">Cada venta cuenta.</h2><p>Últimos 20 registros. Las anulaciones conservan su historial.</p></div><Receipt size={22} strokeWidth={1.4}/></div><div className="ledger-scroll"><table><thead><tr><th>Fecha</th><th>Punto</th><th>Cafés</th><th>Ingreso</th><th>Utilidad est.</th><th><span className="visually-hidden">Corregir</span></th></tr></thead><tbody>{sales?.recentSales.map(sale => <tr key={sale.id} className={sale.voidedAt ? 'is-voided' : ''}><td>{dateText(sale.createdAt)}{sale.voidedAt && <small>Anulada</small>}</td><td>{saleLocations.find(location => location.id === sale.locationId)?.name || sale.locationId}</td><td>{sale.quantity}</td><td>{money(sale.revenueCents)}</td><td>{money(sale.profitCents)}</td><td>{!sale.voidedAt && <button className="admin-icon-button" aria-label={`Anular venta de ${sale.quantity} cafés del ${dateText(sale.createdAt)}`} onClick={event => { trigger.current = event.currentTarget; setChosen(sale); setError(''); dialog.current.showModal(); cancel.current?.focus(); }}><RotateCcw size={15}/></button>}</td></tr>)}</tbody></table></div>{sales && !sales.recentSales.length && <div className="admin-empty"><Receipt size={24}/><p>Tu primera venta aparecerá aquí.<br/>Regístrala en «Un café más» después de cobrar.</p></div>}
    <dialog ref={dialog} className="redemption-dialog" onClose={() => trigger.current?.focus()} onCancel={event => { if (pending) event.preventDefault(); }}><span className="confirmation-icon"><RotateCcw size={23}/></span><h2>¿Anular esta venta?</h2><p>{chosen?.quantity===1?'Se descontará':'Se descontarán'} {chosen?.quantity} {chosen?.quantity===1?'café':'cafés'} y {money(chosen?.revenueCents)} de los ingresos. El registro se conservará como anulado. No cambia cupones ni premios.</p><button className="admin-primary" disabled={pending} onClick={voidRecord}>{pending ? 'Anulando…' : 'Confirmar anulación'}<Check size={17}/></button><button ref={cancel} className="admin-text-button" disabled={pending} onClick={() => dialog.current.close()}>Conservar la venta</button>{error && <p className="admin-error" role="alert">{error}</p>}</dialog>
  </section>;
}
