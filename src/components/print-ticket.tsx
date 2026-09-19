"use client";

export default function PrintTicket() {
  return <button className="ticket-print-button" type="button" onClick={() => window.print()}>Guardar / imprimir boleto <span aria-hidden="true">↓</span></button>;
}
