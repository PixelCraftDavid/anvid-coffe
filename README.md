# Anvid Coffe

Premium coffee scratch-and-reveal experience built with React, Vite and Motion. Fonts (DM Sans and Instrument Serif) and imagery are served locally. Lucide supplies the icon system.

```sh
npm install
npm run dev
npm run build
```

The generated build is in `dist/`.

## Current behavior

- Canvas scratch interaction with pointer capture and touch support. Actual surface coverage determines reveal; there is also a keyboard-accessible reveal button.
- Local preview lottery with a 35% illustrative win probability. Preview controls let the owner explore either outcome.
- Local result persistence and a downloadable PNG demonstration pass.
- One centred glass window: scratch, see win/no-win, then “Dejar una reseña de mi café”. A winning card adds a dismissible celebration above this flow.
- Optional 1–5 star review of the coffee with free text. Reviews are stored on the current device only. All ratings are welcome; the prize is never conditional on reviewing.
- “Ver reseñas del café” opens a view inside the same glass panel, before or after playing. It shows actual locally saved ratings, their average, comments and dates; an empty state is shown before the first review. In the demo the visitor can update their one local opinion. Shared reviews across customer devices still require the production review backend.
- Focus moves between steps. Reduced motion, responsive layout and optional synthesized audio (off by default).
- Moving coffee photography, soft black vignettes, fine grain and an olive flow shader. The shader renders at limited resolution and 30 fps, pauses when hidden, and supports reduced motion and a CSS fallback.
- The cup is an independent transparent photograph. It floats continuously; a win triggers a full spin and scale-down, followed by a spring landing (duration 0.8, bounce 0.3). Twelve photographic coffee bean sprites drift on separate layers behind the glass; mobile uses fewer beans. Reduced motion disables this movement.
- A win also opens a skippable celebration in a native focus-managed dialog: a separate open cup and lid, a spring lid opening, seven rising balloons, 52 confetti particles and four softly sweeping party lights. The headline explicitly announces the free coffee. “Ver mi premio” or Escape returns to the pass and coffee review. Reduced motion keeps the announcement and open cup with gentler feedback.
- Nonwinning cards carry a warm message: “Hoy no tocó. Lo bonito sigue.”, with a wish for a pleasant pause and a reason to smile.
- After a nonwinning result, choosing to review crumples the paper coupon into a photographic paper ball, throws it along an arc into a wire wastebasket, and opens the coffee review form. The sequence lasts 2.2 seconds, offers a skip button, and is skipped for reduced motion. Opening the review from the review list goes straight to the form.
- “Borrar mi reseña de prueba” in the demo options clears local test data and creates a fresh demonstration card.

## Before a customer campaign

This version is a demonstrator, not a secure redemption system. Do not switch off demo labels and treat browser-side results as authoritative.

Implement a server-side campaign before issuing real prizes:

1. Issue an unguessable, single-use play token for each eligible purchase.
2. Allocate results and prize inventory atomically on the server. Never send an unrevealed result to an untrusted client as the source of truth.
3. Persist issued passes, expiration, campaign terms, audit events and redemption status; redeem once through an authenticated staff interface.
4. Define the actual coffee offered, prize budget, probability, dates and eligibility with the owner.
5. Connect an actual review destination and appropriate storage/notice. `src/config.js` contains the reserved `googleReviewUrl`; leave reviews independent from prize eligibility and do not gate the Google invitation by star rating.

The demonstration intentionally does not collect contact details, invent a café location, claim real reviews, or issue redeemable codes.

## Design references

Reviewed Motion, 21st.dev, Skiper UI, Animmaster Lib and HorizonX. Motion is used directly; custom interactions and styling are authored for Anvid Coffe, with no dependency on paid component code.

## Image asset

`public/images/anvid-hero.webp` is a 122 KB generated editorial coffee still life. Created with the built-in image generation tool and corrected to the supplied brand name. Prompt: premium product photograph of an ivory “anvid coffe” takeaway cup and an espresso on travertine, deep olive plaster backdrop, warm diagonal afternoon sunlight, tactile materials, no UI or watermark. The exact generation and brand-correction prompts are in the conversation tool history.

The same built-in image tool generated `anvid-scene.webp` (the background plate with the paper cup removed), `anvid-cup.webp` (the preserved branded cup on actual alpha transparency), and `coffee-bean.webp` (one roasted Arabica bean on actual alpha transparency). They were resized and compressed for web delivery. The cup is animated independently rather than rotating the background photograph. `grain.png` is a small, deterministic procedural grain texture.

`anvid-open-cup.webp`, `anvid-lid.webp` and `paper-ball.webp` were also generated with the built-in image tool on alpha transparency and compressed for delivery. The first two form the animated prize cup; the paper ball bridges the crumpling coupon and basket landing.
