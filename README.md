# Anvid Coffe

Premium coffee scratch-and-reveal experience built with React, Vite and Motion. Fonts (DM Sans and Instrument Serif) and imagery are served locally. Lucide supplies the icon system.

```sh
npm install
npm run dev
npm run build
```

The generated build is in `dist/`.

## Current behavior

- Each full page load opens a short original vector welcome: the moka pot and cup trace themselves, the pot fills and tilts, a continuous coffee stream pours into the rising cup fill, then a crema heart and steam finish the scene. It has an 80 ms setup, a 3.2-second sequence and a 260 ms dissolve into the game, and never repeats during ordinary game transitions. “Saltar bienvenida” and Escape dismiss it; the demo menu offers “Repetir bienvenida”. The native dialog contains focus and returns it to the game title. Reduced motion bypasses the sequence, and hiding the page finishes it without leaving an overlay behind.
- The welcome adds original liquid foley: a soft stream from 1.150 seconds, fuller cup contact at 1.420 seconds, changing cavity resonance during filling, and final drips at 2.410 and 2.525 seconds. CSS and audio share timeline markers and an epoch with output-latency compensation. The local WAV is fetched/decoded asynchronously and reused; its sample synthesis never runs on the visitor’s UI thread. Regenerate it after changing its timeline or texture with `node scripts/render-coffee-pour.mjs`. Sound attempts already-permitted playback; on a first visit, touching anywhere on the welcome unlocks audio at the current phase. The capture-phase pointer-release handler covers the background, artwork and text, with an accessible click fallback. It never overrides saved mute; the sound and skip controls keep their own actions. The welcome has its own silence control, respects the saved mute, and stops on skip, Escape, hiding or unmount. Replay unlocks audio from its actual button click; expired effects never replay.
- The glass now has a neutral centre and a convex lens shoulder/inner lip around its rounded perimeter. A small generated displacement map and SVG backdrop filter bend the actual moving cup, letters and beans at the edges in Chromium, rather than distorting foreground controls. Centre frost, olive tint and two restrained specular rims supply the material's layers. The map is rebuilt only after layout-size changes settle; it has no JS animation loop. Browsers without Chromium's URL backdrop-filter path retain the layered frosted material; reduced transparency/high contrast use an opaque surface. Safari's SVG backdrop-filter limitation is tracked at https://bugs.webkit.org/show_bug.cgi?id=245510.
- Canvas scratch interaction with pointer capture and touch support. Actual surface coverage determines reveal; there is also a keyboard-accessible reveal button.
- Compatible phones receive short 8–12 ms vibration pulses while a real touch moves across the foil, at most once per 90 ms and after 7 px of travel. Holding still never starts a repeating vibration. Release, leaving the foil, cancellation, blur, hiding the page and reveal stop scratch feedback. A win plays a distinct three-pulse pattern (20 / 25 / 55 ms, with pauses); scratch cleanup cannot cancel it. If the first touch has not yet granted browser activation, that win can be delivered once from the actual pointer release within 1.2 seconds. Closing the celebration, muting vibration or hiding the page cancels it. A separate accessible header control saves the vibration preference independently from audio. Reduced motion defaults vibration off; an explicit opt-in uses a shorter single winning pulse. The control is hidden when the Vibration API is absent. Safari on iOS does not support this API; phone hardware, browser policy and system settings determine whether vibration actually occurs. The first touch may need to finish before the browser allows vibration.
- With sound enabled, scratch gestures drive a dry, granular foil texture. Speed changes its level, playback rate and filtering; pressure, horizontal position and remaining foil make smaller adjustments. A stationary touch or hover stays silent. Audio-clock envelopes fade after movement stops, with explicit stops on release, cancel, lost capture, leaving the foil, blur, hiding the tab, muting and reveal. Resources are disposed between strokes; the keyboard reveal alternative never starts scratch audio.
- Local preview lottery with a 35% illustrative win probability. Preview controls let the owner explore either outcome.
- Local result persistence and a downloadable PNG demonstration pass.
- One centred glass window: scratch, see win/no-win, then “Dejar una reseña de mi café”. A winning card adds a dismissible celebration above this flow.
- Optional 1–5 star review of the coffee with free text. Reviews are stored on the current device only. All ratings are welcome; the prize is never conditional on reviewing.
- “Ver reseñas del café” opens a view inside the same glass panel, before or after playing. It shows actual locally saved ratings, their average, comments and dates; an empty state is shown before the first review. In the demo the visitor can update their one local opinion. Shared reviews across customer devices still require the production review backend.
- Focus moves between steps. Reduced motion, responsive layout and optional audio unlocked by a trusted sound, replay or scratch gesture. The welcome may play automatically only when browser policy already permits it; otherwise it remains silent until activated. The speaker button can mute or enable sound; an explicit mute is saved on this device and is respected by later gestures and reloads.
- Moving coffee photography, soft black vignettes, fine grain and an olive flow shader. The shader renders at limited resolution and 30 fps, pauses when hidden, and supports reduced motion and a CSS fallback.
- A supplied Egypt composition reference informs three layers: oversized decorative “ANVID” behind the centred cup silhouette, then the interactive glass window in front. The lid remains visible above the card. An independent positioning anchor keeps the cup centred while its float and winning transforms continue. The background scene is subdued; a deeper olive glass tint maintains light-text readability over the ivory cup. The window is now 380px wide on desktop (350px on shorter viewports, 328px on phones), with compact spacing and a height bounded by the scene, header and footer. The scratch view fits without page scrolling at desktop and phone sizes checked in QA; dense states retain internal scrolling when necessary. Reveal and main action targets remain at least 44px tall.
- The cup is an independent transparent photograph. It floats continuously; a win triggers a full spin and scale-down, followed by a spring landing (duration 0.8, bounce 0.3). Twelve photographic coffee bean sprites drift on separate layers behind the glass; mobile uses fewer beans. Reduced motion disables this movement.
- A win also opens a skippable celebration in a native focus-managed dialog: a separate open cup and lid, a spring lid opening, seven rising balloons, 52 confetti particles and four softly sweeping party lights. The headline explicitly announces the free coffee. “Ver mi premio” or Escape returns to the pass and coffee review. Reduced motion keeps the announcement and open cup with gentler feedback.
- With sound enabled, the celebration adds a restrained success chime, a lid snap at 0.450 seconds, airy releases for the seven balloon launches at 0.700 seconds plus their 0.120-second stagger, and a confetti burst at 0.750 seconds. Visuals and audio share event markers and a start epoch with output-latency compensation. The modal includes its own sound toggle; closing or muting cancels effects, and enabling late seeks to the current phase. No sound is replayed after its sequence has ended. Reduced motion retains only the brief success chime.
- Winning reveals save a fixed `wonAt` ISO timestamp. The celebration, prize panel and downloaded PNG display the same Spanish date and time, including seconds and the configured UTC−6 timezone. Reloading preserves that moment. Earlier saved demo passes without a timestamp say “Fecha no registrada” rather than inventing a winning time.
- Nonwinning cards carry a warm message: “Hoy no tocó. Lo bonito sigue.”, with a wish for a pleasant pause and a reason to smile.
- After a nonwinning result, choosing to review folds the textured coupon on a lit 3D mesh before blending into a photographic paper ball. The ball follows a ballistic arc, compresses against the rim, rebounds towards the opening and falls behind the basket's front edge. The sequence lasts 4.3 seconds, offers a skip button, and is skipped for reduced motion. A CSS fold is used when WebGL is unavailable. Opening the review from the review list goes straight to the form.
- The sound control also governs original procedural paper foley: crumpling during the folds, a metallic rim contact at 2.800 seconds, and a soft landing at 3.920 seconds. Web Audio and the visual animation share a performance-clock epoch and timeline constants, with output-latency compensation. Muting, skipping and hiding the tab cancel queued sound; enabling sound mid-sequence seeks to the current phase. Reduced motion skips the sequence and its effects. Scratch, reveal and review gestures unlock audio only when the visitor has not explicitly muted it.
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

`public/audio/coffee-pour.wav` is original procedural liquid foley, authored by `src/coffeeWelcomeAudio.js` and baked with `scripts/render-coffee-pour.mjs` (44.1 kHz, stereo, 16-bit PCM). It uses no external recording or microphone.
