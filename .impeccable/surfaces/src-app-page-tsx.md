---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Superficie: Landing de reservas

- Objetivo: convertir intención VIP y tráfico público en una reserva pagada de octubre 2026.
- Modo del visitante: Persuade.
- Audiencia y trabajo: familias en móvil que necesitan decidir, elegir horario y pagar el anticipo con confianza.
- Acción principal: seleccionar fecha y hora, completar datos y continuar a Stripe Checkout.
- Prueba disponible: dos fotografías reales del set 2026 y un video vertical real suministrados por el cliente, además de la identidad de Rubiel Photo Art, inventario y condiciones confirmadas.
- Restricciones: no inventar testimonios ni datos del set; noviembre y diciembre sólo dicen “Próximamente”; prioridad absoluta a claridad del precio, disponibilidad y política.

## Dirección elegida

**El Álbum de la Estación.** La referencia móvil se traduce a una revista navideña de bolsillo: portada fotográfica a sangre, bloques de papel cálido, una instantánea familiar, temporadas como catálogo y una agenda que cierra el viaje. El pergamino, la tinta espresso, el latón, el vino navideño y el verde estación pertenecen al mismo mundo; la página no “decora” una tienda con trenes, guía a una familia desde la emoción hasta la salida elegida.

Interacción memorable: el visitante avanza por piezas breves —familia, temporada, estación, reserva— y cada CTA funciona como un boleto hacia el siguiente paso. El video vertical y la nieve acompañan la atmósfera sin competir con la compra; ambos se reducen por completo con `prefers-reduced-motion`.

Riesgo honesto: el lenguaje vintage puede reducir legibilidad o parecer parque temático. Se controla con tipografía funcional moderna en formularios, contraste alto, ornamentación concentrada y estados de agenda inequívocos.

## Direction contract

**THESIS:** Reservar no es llenar un formulario: es elegir la salida de un viaje familiar que sólo ocurre una vez. Rechaza la landing navideña genérica de bloques promocionales repetidos y construye una secuencia continua de cartel, andén, itinerario y boleto.

**OWN-WORLD:** Pergamino cálido a escala de página, grandes campos espresso, vino como señal de decisión y latón dorado como estructura. Marcos finos, remaches sobrios, esquinas de boleto y numeración ferroviaria sustituyen tarjetas redondeadas. Titulares clásicos con presencia; toda interacción, precio y formulario usa una sans de lectura impecable.

**STORY:** La familia descubre el mundo del set, comprueba la calidad de Rubiel, entiende exactamente qué incluye octubre, ve que noviembre y diciembre aún no abren, elige una salida disponible, aplica su privilegio VIP y paga hoy sólo la mitad. Cada sección responde una objeción antes de que aparezca.

**FIRST VIEWPORT:** Portada fotográfica full-bleed con el nombre “La Estación de los Recuerdos”, una promesa emocional breve, precio, anticipo y CTA sobre un overlay oscuro funcional. Debajo, una franja de tres datos funciona como prueba rápida. En móvil, el CTA y la oferta permanecen visibles antes del primer scroll completo; el resto de la página adopta el ritmo de catálogo editorial de la referencia.

**FORM:** El catálogo visual termina en un contador de reserva oscuro y un formulario crema. La disponibilidad conserva estados inequívocos, el cupón modifica el resumen en vivo y el paso final mantiene visibles el anticipo, el saldo y la política. La metáfora ferroviaria nunca desplaza los campos ni las acciones.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones pendientes

- Sustituir arte conceptual por fotografías y video reales del set 2026 cuando estén disponibles.
- Confirmar dirección pública, WhatsApp final, dominio de despliegue y credenciales de Stripe/Resend.
- La sesión usa comp-first por defecto, sin guardar todavía esa preferencia como permanente.

## Comp aprobada

- Archivo: `.impeccable/mocks/comp-01-itinerario.png`.
- Debe conservarse: imagen ferroviaria dominante en el 42% superior móvil, oferta completa y CTA visibles antes del primer scroll, bloque de precio simétrico, línea de viaje oscura como transición y adelanto de galería.
- No debe literalizarse: fotografías generadas como evidencia del set real, textos secundarios inventados por la imagen, iconografía decorativa sin función, ni proporciones rígidas que dañen la adaptación de escritorio.
