import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Coffee, Star } from 'lucide-react';
import { cafe } from './config.js';
import { loadCoffeeReviews } from './coffeeApi.js';

export default function CafeReviews({ titleRef, onBack, onWrite }) {
  const [data, setData] = useState({reviews: [], count: 0, average: 0, nextCursor: null});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const active = useRef(true);
  const pending = useRef(false);
  async function load(cursor) {
    if(pending.current) return;
    pending.current=true;setLoading(true);setError('');
    try {
      const next = await loadCoffeeReviews(cursor);
      if(active.current) setData(old => ({...next,reviews:cursor ? [...old.reviews,...next.reviews.filter(row=>!old.reviews.some(existing=>existing.id===row.id))] : next.reviews}));
    } catch(error) {if(active.current) setError(error.message);}
    finally {pending.current=false;if(active.current) setLoading(false);}
  }
  useEffect(()=>{active.current=true;load();return()=>{active.current=false;};},[]);
  const {reviews,count,average,nextCursor}=data;
  return <>
    <button className="back-to-result" onClick={onBack}><ArrowRight size={14}/> Volver al juego</button>
    <h1 ref={titleRef} tabIndex={-1}>Hablemos<br/><em>del buen café.</em></h1>
    <p className="screen-description">Opiniones sobre el sabor, el aroma<br/>y esos pequeños detalles.</p>
    {count > 0 && <div className="reviews-summary"><span>{average.toFixed(1)}</span><div><div className="review-display-stars" aria-label={`${average.toFixed(1)} de 5 estrellas`}>{[1,2,3,4,5].map(n=><Star key={n} size={16} strokeWidth={1.2} className={n<=Math.round(average)?'filled':''}/>)}</div><p>{count} {count===1?'reseña disponible':'reseñas disponibles'}</p></div></div>}
    {reviews.length > 0 && <div className="coffee-reviews-list" aria-label="Reseñas del café">{reviews.map(review=><article className="coffee-review-item" key={review.id}><div className="coffee-review-item-top"><span>{review.isMine?'Tu opinión':'Una pausa en Anvid'}</span><div className="review-display-stars" aria-label={`${review.rating} de 5 estrellas`}>{[1,2,3,4,5].map(n=><Star key={n} size={12} strokeWidth={1.2} className={n<=review.rating?'filled':''}/>)}</div></div>{review.comment?<p>{review.comment}</p>:<p className="no-comment">Una calificación, sin comentario escrito.</p>}{Number.isFinite(Date.parse(review.createdAt)) && <time dateTime={review.createdAt}>{new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:cafe.timeZone}).format(new Date(review.createdAt))}</time>}</article>)}</div>}
    {loading && <p className="reviews-status" role="status">Buscando las opiniones del café…</p>}
    {error && <div className="api-inline-error" role="alert"><p>{error}</p><button className="text-button" onClick={()=>load(nextCursor)}>Volver a intentar <ArrowRight size={14}/></button></div>}
    {!loading && !error && count===0 && <div className="reviews-empty"><Coffee size={31} strokeWidth={1}/><h2>Aún no hay <em>reseñas.</em></h2><p>Si ya probaste el café,<br/>cuéntanos qué tal estuvo ese primer sorbo.</p></div>}
    {nextCursor && !error && <button className="text-button reviews-more" disabled={loading} onClick={()=>load(nextCursor)}>Ver más reseñas <ArrowRight size={14}/></button>}
    <button className="action reviews-write-button" onClick={onWrite}><span>Escribir una reseña</span><span className="action-arrow"><ArrowRight size={17}/></span></button>
  </>;
}
