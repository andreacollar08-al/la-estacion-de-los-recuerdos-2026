# Visual direction · La Estación de los Recuerdos

## World

“Editorial ferroviaria / instantánea familiar”: una estación victoriana traducida a una revista navideña de bolsillo. La landing debe sentirse como abrir un álbum de recuerdos, elegir una temporada y guardar un boleto para volver a casa.

## Palette

- Pergamino: `#ebe4d9`, `#f6f1e9`, `#fffaf2`
- Espresso: `#151311`
- Tinta secundaria: `#63564b`
- Dorado: `#bb8d55`, `#e7c994`
- Vino: `#8b2e35`
- Verde estación: `#1b4035`

## Typography

- Display: Marcellus with restrained Cinzel-like uppercase labels.
- Narrative: Cormorant Garamond for warmth and memory.
- Functional UI: Jost for dates, form labels, prices and actions.

## Composition

The first viewport is a full-bleed cover using the client's real photograph of two children beside the locomotive. The mobile reference's editorial rhythm is preserved literally: a small brand lockup and menu mark, short proposition, wine CTA and location strip; a family statement with a polaroid-like real photograph; three compact feature proofs; the season catalogue; a cinematic memory band; a four-tile station gallery using the supplied photographs and vertical set video; a short package/offer story; the dark reservation counter; FAQs; and a final image-led CTA. Prices live in the catalogue and reservation flow so the hero stays visually quiet and decisive. No archival gallery, conceptual imagery or unsupported testimonial claims are used.

## Interaction and motion

The reservation has two visible steps: date and time → contact details and payment summary. Going back preserves entered data. Brief entrance and step transitions respect `prefers-reduced-motion`. The vertical video autoplays muted and inline when visible, loops, pauses offscreen and offers play/pause and audio controls. Reduced-motion users start with playback paused. The snow is pointer-safe, can be paused, and shuts off under reduced motion. Controls use visible focus, 48px touch targets, 16px inputs, and live availability/coupon feedback. The page's authored motion is deliberately restrained: one hero entrance plus the form step transition.

The calendar starts with five afternoon/evening times per day. Unopened earlier times are disabled and labeled “Próxima apertura”, not falsely reserved. Each successful preview hold opens one earlier time on that same day. Actual holds are labeled “Apartado”. Availability refreshes every 30 seconds while visible and when the visitor returns to the page; the server enforces the same restrictions.

The details step includes a native people selector. Five people are included; each person from the sixth adds $200 MXN, and the summary applies the 50% split to the complete total, including extras. The policy stays visible next to the final CTA: no refunds, one free date change within the same month and season, subject to availability.

## Content honesty

Only the two photographs and set video supplied by the client are shown; provenance is recorded in `public/media/SOURCES.md`. October is the only phase with public price and inventory; November and December remain “Próximamente”. Do not advertise a total of 80 spaces or use fabricated remaining-space counters or deadlines. Urgency comes from the October dates and the existing ten-use VIP offer. The current reservation API is an in-memory demo; Stripe, persistent storage and Resend are not connected, and the form explicitly says that this preview does not collect payment.
