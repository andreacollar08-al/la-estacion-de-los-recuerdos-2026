import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { getPaymentService, getStripe, paymentMode, PAYMENT_PROJECT } from "@/lib/stripe-payments";
import { getPaymentStore, type PaymentReservation } from "@/lib/payment-store";
import PrintTicket from "@/components/print-ticket";

export const runtime = "nodejs";

function ArrowIcon() {
  return <svg className="icon icon-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>;
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" && /^cs_(live|test)_[A-Za-z0-9]+$/.test(params.session_id) ? params.session_id : null;
  let reservation: PaymentReservation | undefined;
  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.project === PAYMENT_PROJECT) {
        await (await getPaymentService()).applySession(session);
        reservation = await (await getPaymentStore()).getBySession(sessionId);
      }
    } catch { /* Never show a successful payment when verification is unavailable. */ }
  }
  const paid = reservation?.state === "paid";
  const ended = reservation?.state === "expired" || reservation?.state === "failed";
  const demo = !sessionId && paymentMode() === "demo";
  const reference = reservation?.reference;

  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <span className="confirmation-mark" aria-hidden="true">{paid ? "✓" : "·"}</span>
        <p className="eyebrow">PASO SEGURO · STRIPE CHECKOUT</p>
        <h1>{paid ? "Tu sesión está confirmada." : demo ? "Esta es una reserva de demostración." : ended ? "El pago no se completó." : "Estamos verificando tu pago."}</h1>
        <p className="confirmation-lead">{paid && reservation
          ? `${reservation.name}, recibimos tu anticipo de $${reservation.deposit.toLocaleString("es-MX")} MXN. Te esperamos el ${reservation.date} a las ${reservation.time}, para una sesión de ${reservation.people} personas.`
          : demo ? "En esta vista previa no se realiza ningún cobro."
          : ended ? "Vuelve a la agenda para elegir un horario disponible."
          : "Tu reserva aparecerá aquí cuando podamos confirmar el pago con Stripe. Si ya pagaste, consulta el estado de nuevo antes de intentar otro pago."}</p>
        {reference && <div className="reference-line"><span>Referencia</span><strong>{reference}</strong></div>}
        {paid && reservation && <DigitalTicket reservation={reservation} />}
        {paid && reservation && <p className="confirmation-note">Saldo pendiente: ${reservation.balance.toLocaleString("es-MX")} MXN en efectivo el día de la sesión. Incluye {reservation.photos} fotografías.</p>}
        {!paid && !ended && sessionId && <a className="button button-wine" href={`/reserva/confirmacion?session_id=${encodeURIComponent(sessionId)}`}>Consultar estado de nuevo</a>}
        <Link className="button button-dark" href="/#reserva">Volver a la agenda <ArrowIcon /></Link>
      </div>
    </main>
  );
}

function DigitalTicket({ reservation }: { reservation: PaymentReservation }) {
  return <section className="digital-ticket" aria-label="Boleto digital de reserva">
    <div className="ticket-body">
      <div className="ticket-topline"><span className="ticket-brand-lockup"><strong>RUBIEL</strong><small>PHOTO ART</small></span><small>NAVIDAD 2026</small></div>
      <div className="ticket-main-art"><Image className="ticket-train-engraving" src="/media/ticket-train-engraving.png" alt="" width={600} height={300} priority /><div className="ticket-copy"><p className="ticket-kicker">ACCESO<br />PRIORITARIO</p><p className="ticket-validity">VÁLIDO PARA ABORDAR<br />EL TREN DE NAVIDAD</p><h2><span>FAMILIA</span><strong>{reservation.name}</strong></h2></div></div>
      <p className="ticket-experience">· RUBIEL PHOTO ART · <em>LA ESTACIÓN DE LOS RECUERDOS</em> ·</p>
      <div className="ticket-details"><div><small>FECHA</small><strong>{reservation.date}</strong></div><div><small>HORA</small><strong>{reservation.time}</strong></div><div><small>PERSONAS</small><strong>{reservation.people}</strong></div></div>
      <div className="ticket-footer"><span>ANTICIPO RECIBIDO · ${reservation.deposit.toLocaleString("es-MX")} MXN</span><strong>{reservation.reference}</strong></div>
    </div>
    <aside className="ticket-stub ticket-stub-right" aria-hidden="true"><span className="ticket-stub-label">NO.</span><strong className="ticket-number">{reservation.reference.slice(-4)}</strong><span className="ticket-stub-class">CLASE<br />PREFERENTE</span></aside>
    <PrintTicket />
  </section>;
}
