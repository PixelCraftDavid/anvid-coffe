import { ArrowRight, Coffee, Star } from 'lucide-react';
import { readSaved } from './config';

export function getCoffeeReviews() {
  const saved = readSaved();
  const reviews = Array.isArray(saved.reviews) ? saved.reviews : saved.review ? [saved.review] : [];
  return reviews.filter(review => Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
}

export default function CafeReviews({ titleRef, onBack, onWrite }) {
  const reviews = getCoffeeReviews();
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return <>
    <button className="back-to-result" onClick={onBack}><ArrowRight size={14}/> Volver al juego</button>
    <h1 ref={titleRef} tabIndex={-1}>Hablemos<br/><em>del buen café.</em></h1>
    <p className="screen-description">Opiniones sobre el sabor, el aroma<br/>y esos pequeños detalles.</p>
    {reviews.length ? <>
      <div className="reviews-summary"><span>{average.toFixed(1)}</span><div><div className="review-display-stars" aria-label={`${average.toFixed(1)} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} strokeWidth={1.2} className={n <= Math.round(average) ? 'filled' : ''}/>)}</div><p>{reviews.length} {reviews.length === 1 ? 'reseña disponible' : 'reseñas disponibles'}</p></div></div>
      <div className="coffee-reviews-list" aria-label="Reseñas del café">{[...reviews].reverse().map((review, i) => <article className="coffee-review-item" key={`${review.createdAt}-${i}`}><div className="coffee-review-item-top"><span>Tu reseña de prueba</span><div className="review-display-stars" aria-label={`${review.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={12} strokeWidth={1.2} className={n <= review.rating ? 'filled' : ''}/>)}</div></div>{review.comment ? <p>{review.comment}</p> : <p className="no-comment">Una calificación, sin comentario escrito.</p>}{!Number.isNaN(Date.parse(review.createdAt)) && <time dateTime={review.createdAt}>{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date(review.createdAt))}</time>}</article>)}</div>
    </> : <div className="reviews-empty"><Coffee size={31} strokeWidth={1}/><h2>Aún no hay <em>reseñas.</em></h2><p>Si ya probaste el café,<br/>cuéntanos qué tal estuvo ese primer sorbo.</p></div>}
    <button className="action reviews-write-button" onClick={onWrite}><span>Escribir una reseña</span><span className="action-arrow"><ArrowRight size={17}/></span></button>
    <p className="reviews-local-note">Modo demostración: aquí se muestran las opiniones guardadas en este dispositivo.</p>
  </>;
}
