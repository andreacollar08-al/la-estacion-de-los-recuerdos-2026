# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router con TypeScript. La interfaz usa CSS nativo con tokens y componentes React. La reserva actual es una demostración con almacenamiento en memoria, sin cobros ni correos reales. La arquitectura objetivo contempla persistencia SQLite/Cloudflare D1, Stripe Checkout y Resend; esas integraciones, el despliegue y las credenciales siguen pendientes. Nunca deben quedar secretos en el repositorio.

## Users

- Familias de Palenque, Chiapas, que desean reservar una mini sesión navideña 2026 con niños, papás, abuelitos o mascotas y necesitan completar la compra con confianza desde el teléfono.
- Clientes VIP ya pre-registrados, que llegan con mayor intención y pueden usar el cupón limitado `NAVIDAD26`.
- Público general que recibirá la misma landing y debe entender la experiencia, disponibilidad y pago sin contexto previo.

## Product Purpose

Convertir el interés generado por la campaña VIP en reservas confirmadas para “La Estación de los Recuerdos”. La experiencia objetivo permite ver el set real, elegir un horario de octubre, completar datos, aplicar el cupón VIP cuando exista inventario y pagar el 50% de anticipo para bloquear la cita. La interfaz no anuncia “80 espacios”.

El éxito significa que una familia entiende en segundos qué recibe, cuánto paga hoy y después, encuentra un horario real sin empalmes y termina Stripe Checkout con una confirmación clara.

## Positioning

Una experiencia fotográfica navideña breve y guiada que convierte la reserva en el inicio del viaje: una estación victoriana inmersiva, una locomotora a vapor y un itinerario de compra que se siente tan cuidado como la sesión final.

## Operating Context

- Temporada inicial: 21–24 y 28–31 de octubre de 2026.
- Diez horarios diarios: 08:30, 10:00, 11:30, 13:00, 14:30, 16:00, 17:30, 19:00, 20:30 y 22:00.
- Apertura por etapas: inicialmente están a la venta 16:00, 17:30, 19:00, 20:30 y 22:00. Cada apartado válido abre un horario adicional del mismo día, en orden: 08:30, 10:00, 11:30, 13:00 y 14:30. Los no habilitados dicen “Próxima apertura”; sólo apartados existentes dicen “Apartado”.
- La apertura es acumulativa: al vencer un apartado de 20 minutos, se recupera ese horario y no se cierran los ya abiertos. Las otras fechas no cambian. Las solicitudes inválidas o duplicadas no abren horarios.
- En esta demostración la apertura ocurre al crear el apartado; al integrar cobros reales debe ligarse a la confirmación de pago idempotente. Disponibilidad y apertura viven en memoria y no sobreviven un reinicio del servidor.
- La mayoría de visitantes reservará desde iPhone o Android después de recibir un enlace por WhatsApp o redes sociales.
- El anticipo se paga en línea; el saldo se liquida en efectivo el día de la sesión en el estudio.
- Noviembre y diciembre se anuncian únicamente como “Próximamente”, sin precios ni inventario.

## Capabilities and Constraints

- Precio regular de octubre: $1,800 MXN; anticipo no reembolsable de $900 MXN y saldo de $900 MXN.
- Incluye hasta 5 personas. Desde la sexta persona, cada extra cuesta $200 MXN; el extra se suma al total y se divide 50/50 entre anticipo y saldo. El selector permite de 1 a 12 personas.
- Cupón `NAVIDAD26`, sin distinción de mayúsculas, limitado a 10 usos efectivos. Reduce el total a $1,600 MXN, el anticipo y saldo a $800 MXN, y eleva la entrega de 5 a 7 fotografías.
- El anticipo no es reembolsable. Incluye un solo cambio de fecha sin costo, sujeto a disponibilidad, dentro del mismo mes de la reserva y de la misma temporada; no aplica para otra temporada.
- El inventario del cupón debe considerar reclamos confirmados y apartados activos para evitar sobreventa concurrente.
- Un horario queda bloqueado durante 20 minutos mientras se completa el pago y queda confirmado al recibir `checkout.session.completed` de Stripe.
- Las operaciones de disponibilidad, bloqueo, reserva, cupón y webhook deben ser transaccionales e idempotentes.
- Formulario: responsable/familia, WhatsApp mexicano de 10 dígitos, correo y cupón opcional.
- Mobile-first: entradas de 16px o más, objetivos táctiles de 48px o más, sin desbordamiento horizontal, soporte de teclado, reducción de movimiento y contraste accesible.
- No se inventan testimonios, disponibilidad, direcciones, métricas ni fotografías del set 2026.

## Brand Commitments

- Marca: Rubiel Photo Art, del fotógrafo Rubiel Carrillo, en Palenque, Chiapas.
- Campaña: “La Estación de los Recuerdos”.
- Concepto vinculante: estación de tren victoriana navideña, locomotora a vapor, andén nevado, maletas antiguas, faroles cálidos y nostalgia familiar.
- Paleta vinculante proporcionada: pergaminos `#e2d5be`, `#eee3ce`, `#f5ebd9`; espresso `#18130e`, `#211912`, `#261c14`; secundario `#4d3f32`; dorados `#bfa060`, `#e4c88b`; vino `#6a2027`.
- La voz es cálida, familiar, editorial y directa; lujo sin rigidez, urgencia sin presión agresiva.
- Los títulos deben conservar un carácter clásico; el texto funcional debe ser altamente legible. La selección final de fuentes se valida durante la dirección visual.

## Evidence on Hand

- Código y experiencia de la landing VIP anterior en `/Users/mac/Documents/appweb`.
- Dos fotografías del set proporcionadas por el cliente, copiadas sin editar a `public/media/navidad-2026-anden.jpg` y `public/media/navidad-2026-maquinistas.jpg`.
- Video vertical del set proporcionado por el cliente, copiado sin editar a `public/media/navidad-2026-set.mp4` (480 × 864, 26.7 segundos); reproducción automática silenciada, controles de pausa y sonido.
- Los archivos originales y su correspondencia están documentados en `public/media/SOURCES.md`. Por petición expresa, no se usan fotos de sesiones anteriores, arte conceptual ni el video anterior.
- No se proporcionaron testimonios autorizados, dirección pública definitiva, claves de Stripe/Resend ni destino de despliegue.

## Product Principles

1. Mostrar precio, anticipo, saldo y política antes de pedir datos.
2. La agenda es inventario real: ningún estado visual puede prometer un horario que el servidor no puede bloquear.
3. La emoción abre la puerta; la claridad y la confianza cierran la reserva.
4. El privilegio VIP se siente especial, pero el público general recibe una experiencia completa y respetuosa.
5. Cada interacción debe sentirse parte de un viaje coherente, sin sacrificar velocidad ni accesibilidad.

## Accessibility & Inclusion

Cumplir WCAG 2.2 AA en contraste, foco visible, semántica, formularios, mensajes de estado y navegación por teclado. Respetar `prefers-reduced-motion`, ofrecer alternativa al video, pausar animaciones no esenciales y garantizar que la nieve nunca bloquee la interacción ni la lectura.
