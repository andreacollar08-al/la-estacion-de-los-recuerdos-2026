"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EXTRA_PERSON_PRICE, INCLUDED_PEOPLE, INITIAL_RELEASED_TIMES, MAX_PEOPLE, OCTOBER_DATES, TIME_SLOTS, type Availability } from "@/lib/booking-config";
import { getReservationPricing, type ReservationInput } from "@/lib/booking";
import { usePresalePhase } from "@/components/pre-sale-countdown";
import { Confetti, type ConfettiRef } from "@/components/visual-effects";
import { inferLeadSource, type LeadSource } from "@/lib/lead-source";

type AvailabilityDate = Availability["dates"][number];
const calendar: AvailabilityDate[] = OCTOBER_DATES.map((date) => ({
  ...date,
  slots: TIME_SLOTS.map((time) => {
    const available = INITIAL_RELEASED_TIMES.includes(time as (typeof INITIAL_RELEASED_TIMES)[number]);
    return { time, available, status: available ? "available" : "not_open" };
  }),
}));

function displayTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "a. m." : "p. m."}`;
}

function ArrowIcon() {
  return <svg className="icon icon-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>;
}

async function fetchAvailability(): Promise<Availability> {
  const response = await fetch("/api/availability", { cache: "no-store" });
  if (!response.ok) throw new Error("availability");
  return response.json();
}

export default function BookingForm() {
  const [availability, setAvailability] = useState<AvailabilityDate[]>(calendar);
  // Paint the known staged schedule immediately; the API refreshes it in the background.
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(OCTOBER_DATES[0].iso);
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<"schedule" | "details">("schedule");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<Availability["paymentMode"]>("unavailable");
  const [vipServerActive, setVipServerActive] = useState<boolean>();
  const [leadSource] = useState<LeadSource>(() => typeof window === "undefined" ? "direct" : inferLeadSource(window.location.search, document.referrer));
  const paymentAttempt = useRef<{ payload: string; key: string } | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "" });
  const [people, setPeople] = useState(INCLUDED_PEOPLE);
  const nameInput = useRef<HTMLInputElement>(null);
  const dateHeading = useRef<HTMLHeadingElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const phase = usePresalePhase();
  const vipActive = phase === "vip" && vipServerActive !== false;
  const selectedDay = availability.find((date) => date.iso === selectedDate);
  const availableCount = selectedDay?.slots.filter((slot) => slot.available).length ?? 0;
  const pricing = getReservationPricing(people, couponApplied);
  const dateLabel = `${selectedDay?.day ?? ""} de octubre`;
  const selectedSlotAvailable = selectedDay?.slots.some((slot) => slot.time === selectedTime && slot.available);

  async function loadAvailability() {
    try {
      const data = await fetchAvailability();
      setAvailability(data.dates);
      setPaymentMode(data.paymentMode);
      setVipServerActive(data.coupon.active);
      setLoadError(false);
      return data;
    } catch {
      setLoadError(true);
      return null;
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    function refresh() {
      if (document.hidden) return;
      void fetchAvailability()
        .then((data) => { if (active) { setAvailability(data.dates); setPaymentMode(data.paymentMode); setVipServerActive(data.coupon.active); setLoadError(false); } })
        .catch(() => { if (active) setLoadError(true); })
        .finally(() => { if (active) setLoading(false); });
    }
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    if (!vipActive) {
      setCoupon("");
      setCouponApplied(false);
      setCouponMessage("");
    }
  }, [vipActive]);

  function continueToDetails() {
    setStatus("");
    setStep("details");
    requestAnimationFrame(() => nameInput.current?.focus({ preventScroll: true }));
  }
  function changeSchedule() {
    setStep("schedule");
    requestAnimationFrame(() => dateHeading.current?.focus({ preventScroll: true }));
  }
  async function applyCoupon() {
    if (!vipActive) {
      setCouponApplied(false);
      setCouponMessage("La tarifa preferente terminó. Continúa con el precio de preventa.");
      return;
    }
    if (coupon.trim().toUpperCase() !== "NAVIDAD26") {
      setCouponApplied(false);
      setCouponMessage("Código no válido. Revisa el cupón e inténtalo otra vez.");
      return;
    }
    setCheckingCoupon(true);
    try {
      const response = await fetch("/api/availability", { cache: "no-store" });
      if (!response.ok) throw new Error("coupon");
      const data: Availability = await response.json();
      setCouponApplied(data.coupon.available);
      if (data.coupon.available) confettiRef.current?.fire({ particleCount: 108, spread: 78, origin: { x: 0.5, y: 0.58 } });
      setCouponMessage(data.coupon.available ? "Cupón VIP aplicado. Tu tarifa preferente quedó lista para reservar." : "Los 10 cupones VIP ya fueron reclamados. Puedes reservar con la tarifa regular.");
    } catch {
      setCouponApplied(false);
      setCouponMessage("No pudimos validar el cupón. Inténtalo otra vez.");
    } finally { setCheckingCoupon(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlotAvailable) {
      setStatus("Elige un horario disponible para continuar.");
      changeSchedule();
      return;
    }
    setSubmitting(true);
    setStatus("");
    const payload: ReservationInput = { date: selectedDate, time: selectedTime, ...form, people, coupon: couponApplied && vipActive ? "NAVIDAD26" : "", source: leadSource };
    const serialized = JSON.stringify(payload);
    if (!paymentAttempt.current || paymentAttempt.current.payload !== serialized) {
      paymentAttempt.current = { payload: serialized, key: crypto.randomUUID() };
    }
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": paymentAttempt.current.key }, body: serialized });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { paymentAttempt.current = null; setCouponApplied(false); await loadAvailability(); setSelectedTime(""); changeSchedule(); }
        throw new Error(data.error ?? "No pudimos preparar tu reserva. Inténtalo otra vez.");
      }
      window.location.assign(data.paymentUrl);
    } catch (error) { setStatus(error instanceof Error ? error.message : "No pudimos preparar tu reserva."); }
    finally { setSubmitting(false); }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <Confetti ref={confettiRef} />
      <ol className="booking-progress" aria-label="Pasos de la reserva">
        <li aria-current={step === "schedule" ? "step" : undefined}>1. Fecha y horario</li>
        <li aria-current={step === "details" ? "step" : undefined}>2. Tus datos y anticipo</li>
      </ol>
      {step === "schedule" ? (
        <div key="schedule" className="schedule-step">
          <div className="calendar-heading"><h3 ref={dateHeading} tabIndex={-1}>Octubre 2026</h3><span>8 fechas</span></div>
          {loadError ? <div className="load-error" role="alert"><p>No pudimos cargar los horarios.</p><button type="button" className="text-button" onClick={() => { setLoading(true); void loadAvailability(); }}>Volver a intentar</button></div>
            : <p className="calendar-status" aria-live="polite">{loading ? "Consultando disponibilidad…" : `${availableCount} horarios disponibles el ${dateLabel}`}</p>}
          <div className="date-grid" role="group" aria-label="Fecha de la sesión">
            {availability.map((date) => {
              const free = date.slots.filter((slot) => slot.available).length;
              return <button type="button" key={date.iso} className="date-button" aria-pressed={selectedDate === date.iso}
                aria-label={`${date.weekday} ${date.day} de octubre, ${loading ? "cargando" : `${free} horarios disponibles`}`}
                disabled={loading || loadError || free === 0} onClick={() => { setSelectedDate(date.iso); setSelectedTime(""); setStatus(""); }}>
                <span>{date.weekday}</span><strong>{date.day}</strong>
              </button>;
            })}
          </div>
          <fieldset className="time-fieldset"><legend>Elige tu horario</legend>
            <p className="release-note">Los horarios de la mañana se abren gradualmente con cada reserva confirmada.</p>
            <div className="time-grid">{selectedDay?.slots.map((slot) => (
              <button type="button" key={slot.time} className="time-button" aria-pressed={selectedTime === slot.time}
                aria-label={`${displayTime(slot.time)}${loading ? ", cargando" : slot.status === "held" ? ", apartado" : slot.status === "not_open" ? ", reservado" : selectedTime === slot.time ? ", seleccionado" : ", disponible"}`}
                disabled={loading || loadError || !slot.available} onClick={() => setSelectedTime(slot.time)}><span>{displayTime(slot.time)}</span>{!loading && (selectedTime === slot.time ? <small>Seleccionado</small> : slot.status !== "available" ? <small>{slot.status === "held" ? "Apartado" : "Reservado"}</small> : <small>Disponible</small>)}</button>
            ))}</div>
          </fieldset>
          <button className="button button-wine next-button" type="button" disabled={!selectedSlotAvailable || loading || loadError} onClick={(event) => { event.preventDefault(); continueToDetails(); }}>Continuar con mis datos <ArrowIcon /></button>
          <p className="step-note">{vipActive ? "Anticipo del 50% · cupón VIP sorpresa · lugares limitados" : "Anticipo del 50% · preventa general · 5 fotos editadas"}</p>
        </div>
      ) : (
        <div key="details" className="details-step">
          <div className="selected-schedule"><div><span>Tu sesión</span><strong>{dateLabel} · {displayTime(selectedTime)}</strong></div><button className="text-button" type="button" onClick={changeSchedule}>Cambiar</button></div>
          <div className="fields-grid">
            <label className="field-wide">Nombre del responsable<input ref={nameInput} required minLength={2} maxLength={90} autoComplete="name" value={form.name} onChange={(e) => { const name = e.target.value; setForm((current) => ({ ...current, name })); }} /></label>
            <label>WhatsApp<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" placeholder="10 dígitos" value={form.whatsapp} onChange={(e) => { const whatsapp = e.target.value.replace(/\D/g, ""); setForm((current) => ({ ...current, whatsapp })); }} /></label>
            <label>Correo electrónico<input required type="email" maxLength={150} autoComplete="email" value={form.email} onChange={(e) => { const email = e.target.value; setForm((current) => ({ ...current, email })); }} /></label>
            <label className="field-wide people-field">Personas en la sesión<select value={people} onChange={(e) => setPeople(Number(e.target.value))}>{Array.from({ length: MAX_PEOPLE }, (_, index) => { const count = index + 1; return <option key={count} value={count}>{count} {count === 1 ? "persona" : "personas"}</option>; })}</select><small>Hasta {INCLUDED_PEOPLE} personas incluidas · desde la {INCLUDED_PEOPLE + 1}.ª: +${EXTRA_PERSON_PRICE} MXN por persona</small></label>
          </div>
          {vipActive ? <div className="coupon-field">
            <label htmlFor="coupon">Cupón VIP sorpresa <span>(para familias registradas)</span></label>
            <div className="coupon-row"><input id="coupon" value={coupon} maxLength={24} autoCapitalize="characters" spellCheck={false} placeholder="Código de acceso" aria-describedby="coupon-message" onChange={(e) => { setCoupon(e.target.value); setCouponApplied(false); setCouponMessage(""); }} /><button type="button" disabled={checkingCoupon} onClick={() => void applyCoupon()}>{checkingCoupon ? "Validando…" : "Aplicar"}</button></div>
            <p id="coupon-message" role="status" className={couponApplied ? "success-message" : "error-message"}>{couponMessage}</p>
          </div> : <div className="coupon-field coupon-disabled"><p role="status">Precio de preventa: $1,800 MXN por sesión · 5 fotos editadas.</p></div>}
          <dl className="payment-summary">
            <div><dt>Sesión · {couponApplied ? 7 : 5} fotos</dt><dd>${pricing.base.toLocaleString("es-MX")} MXN</dd></div>
            {couponApplied && <div className="discount-row"><dt>Descuento VIP</dt><dd>−$200 MXN</dd></div>}
            {pricing.extraPeople > 0 && <div><dt>{pricing.extraPeople} persona{pricing.extraPeople === 1 ? "" : "s"} extra</dt><dd>+${pricing.extraFee.toLocaleString("es-MX")} MXN</dd></div>}
            <div><dt>Total</dt><dd>${pricing.total.toLocaleString("es-MX")} MXN</dd></div>
            <div className="total-row"><dt>Anticipo del 50% {pricing.extraPeople > 0 ? "(incluye extras)" : ""}</dt><dd>${pricing.deposit.toLocaleString("es-MX")} MXN</dd></div>
            <div><dt>Saldo en efectivo el día de la sesión</dt><dd>${pricing.balance.toLocaleString("es-MX")} MXN</dd></div>
          </dl>
          <button className="button button-wine submit-button" type="submit" disabled={submitting || paymentMode === "unavailable"}>{submitting ? "Preparando tu reserva…" : `Continuar · $${pricing.deposit.toLocaleString("es-MX")} MXN`}<ArrowIcon /></button>
          <p className="form-legal">Anticipo no reembolsable. Incluye un cambio de fecha gratis, sujeto a disponibilidad, dentro del mismo mes y temporada.</p>
          <p className="preview-note">{paymentMode === "stripe" ? "Pago seguro con tarjeta a través de Stripe. Tu lugar queda confirmado al recibir el anticipo." : paymentMode === "demo" ? "Vista previa: todavía no se realizan cobros." : "Los pagos estarán disponibles próximamente."}</p>
        </div>
      )}
      {status && <p className="form-status" role="alert">{status}</p>}
    </form>
  );
}
