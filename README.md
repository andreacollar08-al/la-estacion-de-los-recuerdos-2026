La Estacion de los Recuerdos 2026

Production Stripe checkout for rubielphoto.com.

VPS environment:
STRIPE_SECRET_KEY=configure_in_secret_manager
STRIPE_WEBHOOK_SECRET=configure_in_secret_manager
STRIPE_PAYMENTS_ENABLED=true
NEXT_PUBLIC_SITE_URL=https://rubielphoto.com
MOCK_PAYMENTS=false

Stripe webhook URL:
https://rubielphoto.com/api/webhooks/stripe

Select these events:
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired

Checkout creates a 900 MXN deposit session. Metadata includes customer name, phone, email, date, time, reservation reference, and project navidad-2026. Signed webhooks use STRIPE_WEBHOOK_SECRET. Reservation updates are idempotent: successful payment marks paid, saves session and payment intent IDs, and blocks the slot. Failed or expired payment releases the slot.

Verification commands:
npm test -- --run
npm run build
npm start

Never commit real Stripe keys, webhook secrets, passwords, or other credentials. The canonical application origin and all checkout URLs are https://rubielphoto.com.
