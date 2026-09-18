import Link from "next/link";

function ArrowIcon() {
  return <svg className="icon icon-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>;
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : "RPA-PENDIENTE";
  const name = typeof params.name === "string" ? params.name : "tu familia";
  const deposit = typeof params.deposit === "string" ? params.deposit : "900";
  const total = typeof params.total === "string" ? params.total : "1,800";
  const people = typeof params.people === "string" ? params.people : "5";

  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <span className="confirmation-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">PASO SEGURO · STRIPE CHECKOUT</p>
        <h1>Tu horario está apartado por 20 minutos.</h1>
        <p className="confirmation-lead">{name}, esta es una pantalla de demostración de la integración. Aquí se abriría Stripe Checkout para cubrir tu anticipo de ${deposit} MXN por una sesión de ${total} MXN para {people} personas.</p>
        <div className="reference-line"><span>Referencia</span><strong>{reference}</strong></div>
        <p className="confirmation-note">En producción, el webhook confirmará el pago y enviará tu recibo digital por correo. Tu lugar solo queda confirmado cuando Stripe reporte el pago exitoso.</p>
        <Link className="button button-dark" href="/#reserva">Volver a la agenda <ArrowIcon /></Link>
      </div>
    </main>
  );
}
