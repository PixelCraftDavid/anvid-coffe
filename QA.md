# Verification

Verified in the in-app browser on 20 October 2026.

- Desktop viewport: 1280 × 720. Mobile viewport: 390 × 844. No horizontal page overflow. The glass game card is horizontally centred; height is bounded on small windows.
- Actual pointer drags erase the foil and progress coverage; four broad strokes revealed the result. Repeated coverage does not artificially increase progress.
- The accessible “Descubrir sin raspar” alternative reveals the result.
- Both winning and nonwinning outcomes were exercised. Both display the coffee review button.
- A winning demonstration pass successfully downloaded as a PNG.
- The result survives a reload.
- Submitting a review without a rating displays a validation message. A 2-star review is accepted.
- “Ver reseñas del café” works before playing. Empty state, writing a review, viewing its actual rating/comment/date and returning to the game were verified.
- Review storage is local to the browser. No fabricated public reviews or production redemption claims are used.
- The backdrop WebGL canvas has a bounded resolution, 30 fps cap, hidden-tab suspension, reduced-motion static render and CSS fallback. The image animation is CSS transform based.
- The separate 850px transparent cup and 160px transparent bean assets loaded successfully. Twelve bean elements were present. Continuous cup/bean CSS animations were verified.
- A winning reveal was observed during rotation/scale-down and after the spring settled. The final cup transform was scale(0.76), translateY(16px); the result and review button remained visible.
- The new winning dialog was exercised at 390 × 844: the branded cup appears, the lid opens, seven balloons rise and remain around the announcement, confetti bursts and party lights move. The prize button returns to the result.
- A nonwinning result displays the warm paper coupon. Choosing the review visibly shrinks and folds it, cross-fades into the transparent photographic ball and launches it toward the wastebasket. The coffee review form opens automatically after the 2.2-second sequence. “Saltar animación y escribir” was also verified to open the form immediately.
- The production Vite build passed with the celebration and paper-toss components.
- The initial development-only createRoot warning was fixed by separating the React app from the entry module. Those historical logs predate the fix.

Not tested on physical phone hardware. Shared review storage, real purchase tokens and one-use prize redemption are not implemented in this demonstration.
