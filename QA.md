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
- A nonwinning result displays the warm paper coupon. Choosing the review folds its texture on a WebGL mesh and blends into the transparent photographic ball. The 4.3-second sequence visibly contacts the basket rim, rebounds upward, moves toward the opening and falls behind the front rim and wire mesh. Automatic review-form entry and “Saltar animación y escribir” were verified. Shader activation was checked through the canvas renderer state; the CSS fallback remains available.
- The production Vite build passed with the celebration and paper-toss components.
- Paper audio was checked at 48 kHz for finite samples, headroom, silent gaps and effects at the shared rim/landing markers (2.800 and 3.920 seconds). A controlled audio boundary verified output-latency compensation, seeking on late unmute, cancellation on skip/mute and hidden-tab cancellation. Browser sound-toggle, mid-sequence mute/reactivation, skipping and automatic review entry were exercised without console warnings. Physical speaker and phone listening quality has not been auditioned.
- The winning sound buffer was checked for finite samples/headroom, lid and confetti cue energy, later balloon sounds, and a silent tail. The shared scheduler passed cancellation, output-latency and late-enable checks; the paper-audio checks still pass. The celebration's sound toggle was exercised in the browser.
- The scratch texture was checked for finite samples, headroom and zero-valued loop edges. A controlled audio boundary verified silence before motion, rejection of pointer jitter, increasing gain/rate for faster strokes, scheduled silence while held still, click-free stopping without cancelAndHoldAtTime, release, resume, mute and disposal. Paper and win audio checks still passed. Two actual browser pointer drags erased 39% of the reveal threshold without console errors. Finger hardware and physical speaker quality remain untested.
- Automatic sound activation was exercised with a direct scratch gesture after reload, without clicking the speaker. Audio unlock and scratch-controller creation run synchronously in the input handler. Explicit mute was then saved, the page reloaded, and another actual scratch left the speaker muted. The page does not create or resume an audio context merely by loading. The speaker remains available before the first scratch to opt out.
- A controlled Vibration API boundary verified touch-only pulses, jitter rejection, the 90 ms rate limit, no repeating feedback while stationary, stop/resume, the distinct winning pattern, and ownership across scratch unmount. It also checked mute, reduced-motion feedback, hidden-page guards, one-time first-touch activation delivery with expiry, and absent/blocked APIs. Physical vibration strength and feel still require a compatible phone.
- The vibration header control was toggled off, then remained off after reload while audio stayed enabled. Re-enabling it, scratching with an actual pointer, and revealing/closing a winning celebration were exercised without console errors. At 390 × 844 both header controls measured 44 × 44 CSS pixels, and page width matched the viewport without horizontal overflow. This browser verification does not establish that phone hardware vibrates.
- A newly revealed win showed the same date/time in the celebration and prize panel. Its exact ISO timestamp survived a page reload unchanged. A newly downloaded PNG was visually inspected and included the matching date, time and UTC−6 label. Formatter checks cover midnight in the displayed timezone, invalid/missing dates and old passes without timestamps.
- The initial development-only createRoot warning was fixed by separating the React app from the entry module. Those historical logs predate the fix.

Not tested on physical phone hardware. Shared review storage, real purchase tokens and one-use prize redemption are not implemented in this demonstration.
