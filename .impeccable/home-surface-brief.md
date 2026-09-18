# Superficie: Landing de reservas

- Objetivo: convertir intención VIP y tráfico público en una reserva pagada de octubre 2026.
- Modo del visitante: Persuade.
- Audiencia y trabajo: familias en móvil que necesitan decidir, elegir horario y pagar el anticipo con confianza.
- Acción principal: seleccionar fecha y hora, completar datos y revisar el anticipo. El cobro real por Stripe sigue pendiente; la versión actual es una demostración.
- Prueba disponible: dos fotografías y un video vertical del set suministrados por el cliente. Sustituyen todo material conceptual y de campañas anteriores.
- Restricciones: no inventar testimonios ni datos del set; noviembre y diciembre sólo dicen “Próximamente”; prioridad absoluta a claridad del precio, disponibilidad y política.

## Dirección elegida

**El Gran Itinerario.** Un cartel de viaje ferroviario de lujo de la Belle Époque se convierte en un sistema de reserva contemporáneo: pergamino impreso, tinta espresso, latón envejecido, vino navideño y señalética de andén. La página no “decora” una tienda con trenes; se comporta como el itinerario corto de una familia que elige salida, recibe boleto y aborda.

Refinamiento solicitado: una interfaz corta y directa, con foto, precio y CTA claros; una sola sección de set y beneficios; reserva en dos pasos y preguntas plegables. Las transiciones de entrada y cambio de paso son breves. El video vertical se reproduce silenciado al entrar en pantalla, con pausa y sonido opcional. Nieve, video automático y transiciones respetan `prefers-reduced-motion`.

Riesgo honesto: el lenguaje vintage puede reducir legibilidad o parecer parque temático. Se controla con tipografía funcional moderna en formularios, contraste alto, ornamentación concentrada, fotografía real como protagonista y estados de agenda inequívocos.

## Direction contract

**THESIS:** Reservar no es llenar un formulario: es elegir la salida de un viaje familiar que sólo ocurre una vez. Rechaza la landing navideña genérica de bloques promocionales repetidos y construye una secuencia breve de portada, andén, agenda y boleto.

**OWN-WORLD:** Pergamino cálido a escala de página, grandes campos espresso, vino como señal de decisión y latón dorado como estructura. Marcos finos, remaches sobrios, esquinas de boleto y numeración ferroviaria sustituyen tarjetas redondeadas. Titulares clásicos con presencia; toda interacción, precio y formulario usa una sans de lectura impecable.

**STORY:** Ver el set real → entender precio y beneficio VIP → elegir horario → completar datos y revisar el anticipo. No se anuncia “80 espacios”; la urgencia se limita a las fechas de octubre y al beneficio real de diez usos. Noviembre y diciembre sólo se anuncian como próximos.

**FIRST VIEWPORT:** Portada de pantalla completa con la fotografía real dominando todo el campo. Una capa oscura funcional sostiene el nombre “La Estación de los Recuerdos”, una promesa emocional breve, el precio, el anticipo y un CTA tipo boleto. La navegación es mínima y vive sobre la imagen. En móvil, la composición conserva al niño, el tren y la oferta en la misma pantalla inicial; el CTA ocupa el ancho disponible y queda listo para el pulgar.

**FORM:** Se conserva la dirección Belle Époque en tipografía, pergamino y colores. Se eliminan galería histórica, narrativa larga, fases en tarjetas y adornos que retrasaban la reserva. El formulario muestra sólo fecha y hora en el primer paso; después, datos y resumen del anticipo. La funcionalidad tiene prioridad sobre la metáfora ferroviaria.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones pendientes

- Material real recibido e integrado; no reutilizar medios de campañas anteriores.
- Confirmar dirección pública, WhatsApp final, dominio de despliegue y credenciales de Stripe/Resend.
- La sesión usa comp-first por defecto, sin guardar todavía esa preferencia como permanente.
