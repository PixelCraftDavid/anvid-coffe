# Anvid Coffe

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Customers who buy and taste Anvid Coffe, primarily using their phones.

## Product Purpose
A premium scratch-and-reveal experience where a customer may win a coffee and can optionally leave an honest review about the coffee they tasted.

## Brand Commitments
The user supplied the exact name “Anvid Coffe”. They requested premium, elegant, clean, polished design with fluid motion and references to motion.dev, 21st.dev, Skiper UI, animmasterlib.dev and horizonx.so.

## Capabilities and Constraints
The experience supports canvas scratching, an accessible reveal button, winning and nonwinning outcomes, a downloadable coupon, and optional coffee reviews. Vercel's server API and Firebase Firestore replace the old local-only demonstration. Results are decided on the server with at most one global winner per UTC−6 day, protected by a transaction. Opinions concern the coffee, never the gift. A review never affects eligibility or the result.

## Open Decisions
Purchase validation, authenticated customer identity, campaign dates, coupon expiration and actual café products have not been supplied. One signed browser cookie provides one card per day; it does not establish a person's identity. The owner requested a private staff panel and single-use redemption, implemented with a shared server-side password and atomic Firestore redemption. No fictitious social proof, location or reviews are used.

## Confirmed deployment preferences
Only free plans and services, without enabling paid billing. GitHub is public at PixelCraftDavid/anvid-coffe and the owner published to https://anvid-coffe.vercel.app/. The owner created Firebase project anvid-coffe and Firestore Standard (default), nam5, in production mode on Spark. Integration uses Vercel Node functions and Firebase Admin SDK, with a private server-only secret configured by the owner. Cloud Functions, Storage, Analytics and billing are unused. Coupon records contain identifier, win/no-win and server dates. Coffee reviews contain one 1–5 star rating, comment and server dates, with an aggregate for the global average. Production state and shared-review reads were verified on 21 October 2026 without creating a real coupon or public test review.

The owner requested removal of the demonstration menu and “Buen café. Pequeños rituales.” footer. A successful draw consumes the entire day's one prize; subsequent draws cannot win. The existing 35% probability remains before that slot is claimed; there can be zero winners. A new UTC−6 day creates a fresh slot automatically.

The panel has an additional random 40-character route and genuine server authentication; the route itself is not treated as a credential. The owner confirmed setting `ANVID_ADMIN_PASSWORD` as a Production Secret in Vercel. The revised dashboard follows the supplied charcoal/light composition, with photo-free review cards and an annual contribution map that toggles between 2D and isometric 3D by clicking the map itself; there is no separate switch. Motion accordion controls unfold the redemption methods while validation remains stable. QR contents are `ANVID:` plus the coupon code, never the private dashboard URL. The customer can display the QR or download it in the PNG. No expiration was invented. Existing code-only winning coupons remain valid, and repeated or concurrent redemptions are rejected server-side.

The owner also requested a phone QR/redemption trial that does not spend the daily prize. The authenticated panel provides TEST coupons in a separate `testCoupons` collection, with explicit no-value labels, a downloadable QR and a simulated single-use confirmation. They do not alter real prizes, participants or totals. For mobile performance, the annual map uses one bounded, demand-driven 2D canvas with an isometric projection, paused when idle/offscreen/hidden, rather than hundreds of independently animated DOM faces.
