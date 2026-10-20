# Anvid Coffe visual direction

An intimate editorial world: deep olive, black edges, liquid glass and afternoon light. The entire experience is one centred game window, followed by its result and a button to review the coffee.

- Paper: #f6f4ed. Ink: #292b24. Olive: #444b32. Muted olive: #737e52.
- Display: Instrument Serif, regular and italic. Interface: DM Sans.
- One card centred in the viewport. No landing page, marketing sections or game modal. The user explicitly requested this sequence.
- The user requested stronger curvature, liquid glass, moving coffee photography, green light around the coffee fading smoothly into black at the edges, subtle grain and flowing colour.
- Glass uses 29–36px corners, a fine specular rim, inset highlights, translucent olive and a bounded backdrop blur. Child controls have soft 14–20px corners.
- A low-resolution WebGL flow field supplies olive light and static grain at 30 fps. It pauses in hidden tabs and renders a static frame for reduced motion. CSS animates the photo and ambient light layers using transforms and opacity, with a CSS fallback when WebGL is unavailable.
- The paper cup is a separate alpha image over a cleaned background plate. It continuously floats and tilts. A win spins it 360 degrees, shrinks it, then lands with a spring (duration 0.8, bounce 0.3). Photographic beans pass behind the glass to make its depth visible. The material uses 12–15px blur, boosted saturation, thin specular rims and contrast-aware light text.
- Canvas removes foil under pointer input; coverage unlocks the result. Motion provides short state transitions and success feedback. Review focus moves to the next step's title.
- Strong ease-out: cubic-bezier(.23,1,.32,1); UI transitions 150–250ms. Pointer spring duration 0.5, bounce 0.2.
- Reduced motion removes parallax, rotation, marquee and confetti. Touch gets direct scratch input and no sticky hover transforms.
- Responsive at 620px, 800px and 1100px, with touch-safe controls, safe-area dialog padding and accessible alternative reveal.

References inspected: https://motion.dev, https://21st.dev, https://skiper-ui.com, https://horizonx.so, https://animmasterlib.dev. Motion is the installed runtime. Components are authored for Anvid rather than copying paid component code.
