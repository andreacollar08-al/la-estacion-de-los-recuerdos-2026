"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Section = "dashboard" | "calendar" | "reservations" | "payments" | "extras" | "photos" | "reports" | "settings";
type PhotoStatus = "pendientes" | "en_edicion" | "listas" | "entregadas";
type Reservation = {
  reference: string; date: string; time: string; name: string; whatsapp: string; email: string;
  people: number; photos: number; couponApplied: boolean; state: "held" | "processing" | "paid" | "expired" | "failed";
  base: number; extraPeople: number; extraFee: number; total: number; deposit: number; balance: number;
  photoStatus: PhotoStatus; adminNote: string; createdAt: number;
};
type Slot = { time: string; status: "available" | "held" | "not_open"; available: boolean; reservation: Reservation | null };
type CalendarDate = { iso: string; weekday: string; day: string; slots: Slot[] };
type DashboardData = {
  paymentMode: "demo" | "stripe" | "unavailable";
  generatedAt: string;
  metrics: { scheduledSlots: number; reservations: number; availableSlots: number; confirmed: number; collected: number; pending: number };
  coupon: { code: string; limit: number; claimed: number; available: boolean; active: boolean };
  calendar: CalendarDate[];
  reservations: Reservation[];
};

const nav: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "calendar", label: "Calendario", icon: "□" },
  { id: "reservations", label: "Clientes / Reservas", icon: "♙" },
  { id: "payments", label: "Pagos", icon: "▤" },
  { id: "extras", label: "Extras", icon: "✦" },
  { id: "photos", label: "Fotos", icon: "▧" },
  { id: "reports", label: "Reportes", icon: "▥" },
  { id: "settings", label: "Configuración", icon: "⚙" },
];

const photoStatusLabels: Record<PhotoStatus, string> = {
  pendientes: "Pendientes",
  en_edicion: "En edición",
  listas: "Listas",
  entregadas: "Entregadas",
};

function money(value: number) {
  return `$${value.toLocaleString("es-MX")} MXN`;
}

function dateLabel(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day} ${month === "10" ? "de octubre" : ""}`;
}

function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "a. m." : "p. m."}`;
}

function stateLabel(value: Reservation["state"]) {
  return value === "paid" ? "Pagada" : value === "held" ? "Apartada" : value === "processing" ? "Procesando" : value === "expired" ? "Expirada" : "Fallida";
}

function stateClass(value: Reservation["state"]) {
  return value === "paid" ? "is-paid" : value === "held" || value === "processing" ? "is-pending" : "is-muted";
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="admin-empty"><span>✦</span><p>{children}</p></div>;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean>();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Reservation["state"]>("all");
  const [photoFilter, setPhotoFilter] = useState<"all" | PhotoStatus>("all");
  const [saving, setSaving] = useState("");
  const [toast, setToast] = useState("");

  async function loadDashboard(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); setData(null); return; }
      if (!response.ok) throw new Error("No pudimos cargar el panel.");
      setData(await response.json());
      setAuthenticated(true);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No pudimos cargar el panel.");
    } finally { setRefreshing(false); }
  }

  useEffect(() => { void loadDashboard(false); }, []);

  useEffect(() => {
    if (authenticated !== true) return;
    const timer = window.setInterval(() => { void loadDashboard(false); }, 15_000);
    return () => window.clearInterval(timer);
  }, [authenticated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setLoginError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos iniciar sesión.");
      setPassword("");
      await loadDashboard();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No pudimos iniciar sesión.");
    } finally { setLoading(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false); setData(null); setSection("dashboard");
  }

  async function saveReservation(reservation: Reservation, patch: { photoStatus?: PhotoStatus; adminNote?: string }) {
    setSaving(reservation.reference);
    try {
      const response = await fetch("/api/admin/reservations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: reservation.reference, ...patch }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos guardar el cambio.");
      setToast("Reserva actualizada.");
      await loadDashboard(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No pudimos guardar el cambio.");
    } finally { setSaving(""); }
  }

  async function createManualReservation(payload: Record<string, unknown>) {
    setSaving("new");
    try {
      const response = await fetch("/api/admin/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos registrar la reserva.");
      setShowNewReservation(false);
      setToast(`Reserva ${result.reference} registrada.`);
      await loadDashboard(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No pudimos registrar la reserva.");
    } finally { setSaving(""); }
  }

  function exportCsv() {
    if (!data) return;
    const headings = ["Referencia", "Fecha", "Hora", "Cliente", "WhatsApp", "Correo", "Personas", "Fotos", "Estado pago", "Anticipo", "Saldo", "Estado fotos", "Notas"];
    const rows = data.reservations.map((r) => [r.reference, r.date, r.time, r.name, r.whatsapp, r.email, r.people, r.photos, stateLabel(r.state), r.deposit, r.balance, photoStatusLabels[r.photoStatus], r.adminNote]);
    const csv = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "rubiel-reservas-2026.csv"; link.click(); URL.revokeObjectURL(url);
  }

  const filteredReservations = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.reservations.filter((reservation) => {
      const matchesSearch = !query || [reservation.name, reservation.email, reservation.whatsapp, reservation.reference].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || reservation.state === statusFilter;
      const matchesPhoto = photoFilter === "all" || reservation.photoStatus === photoFilter;
      return matchesSearch && matchesStatus && matchesPhoto;
    });
  }, [data, search, statusFilter, photoFilter]);

  if (authenticated === false) {
    return <main className="admin-login-shell"><section className="admin-login-card"><div className="admin-brand"><span>RUBIEL</span><small>PHOTO ART · CONTROL INTERNO</small></div><div className="admin-login-copy"><p className="admin-eyebrow">Acceso privado</p><h1>Tu estudio,<br /><em>bajo control.</em></h1><p>Administra reservas, pagos, extras y entregas desde cualquier teléfono.</p></div><form onSubmit={handleLogin} className="admin-login-form"><label htmlFor="admin-password">Contraseña<input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" required /></label>{loginError && <p className="admin-error" role="alert">{loginError}</p>}<button className="admin-primary-button" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar al control interno"}<span>→</span></button></form><a className="admin-back-link" href="/">← Volver a la landing</a></section></main>;
  }

  if (!data) return <main className="admin-loading"><div className="admin-spinner" /><p>Abriendo el control interno…</p></main>;

  const activeTitle = nav.find((item) => item.id === section)?.label ?? "Dashboard";
  const upcoming = data.reservations.filter((reservation) => ["paid", "held", "processing"].includes(reservation.state)).slice(0, 5);
  const extrasTotal = data.reservations.reduce((sum, reservation) => sum + reservation.extraFee, 0);
  const photoCounts = (Object.keys(photoStatusLabels) as PhotoStatus[]).map((status) => ({ status, count: data.reservations.filter((reservation) => reservation.photoStatus === status).length }));

  return <div className="admin-app">
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><strong>RUBIEL</strong><span>PHOTO ART</span></div><nav aria-label="Navegación del control interno">{nav.map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</nav><div className="admin-user"><div className="admin-avatar"><Image src="/media/admin-profile.jpg" alt="Rubiel Photo Art" width={44} height={44} /></div><div><strong>Rubiel Photo Art</strong><small>Administrador</small></div></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><p className="admin-eyebrow">RUBIEL PHOTO ART · CONTROL INTERNO</p><h1>{activeTitle === "Dashboard" ? "Calendario de sesiones" : activeTitle}</h1><p className="admin-subtitle">{section === "dashboard" ? "Consulta cada fecha, día y horario con el registro del cliente." : "Gestiona tu operación desde un solo lugar."}</p></div><div className="admin-actions"><button className="admin-primary-button" onClick={() => { setSection("reservations"); setShowNewReservation(true); }}>＋ Nueva reserva</button><button className="admin-secondary-button" onClick={exportCsv}>↓ Exportar</button><button className="admin-secondary-button admin-hide-mobile" onClick={() => void logout()}>Cerrar sesión</button><button className="admin-icon-button" aria-label="Actualizar" onClick={() => void loadDashboard()} disabled={refreshing}>↻</button></div></header>
      <div className="admin-mobile-nav">{nav.slice(0, 5).map((item) => <button key={item.id} className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)}><i>{item.icon}</i><span>{item.label.split(" ")[0]}</span></button>)}</div>
      <div className="admin-kpi-strip"><span><strong>{data.metrics.confirmed}</strong> confirmadas</span><span><strong>{money(data.metrics.collected)}</strong> cobrado</span><span><strong>{money(data.metrics.pending)}</strong> pendiente</span></div>
      {section === "dashboard" && <DashboardSection data={data} upcoming={upcoming} onNavigate={setSection} />}
      {section === "calendar" && <CalendarSection data={data} />}
      {section === "reservations" && <ReservationsSection data={data} reservations={filteredReservations} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} photoFilter={photoFilter} setPhotoFilter={setPhotoFilter} saving={saving} onSave={saveReservation} showNewReservation={showNewReservation} onCloseNewReservation={() => setShowNewReservation(false)} onCreate={createManualReservation} />}
      {section === "payments" && <PaymentsSection data={data} />}
      {section === "extras" && <ExtrasSection data={data} total={extrasTotal} />}
      {section === "photos" && <PhotosSection data={data} counts={photoCounts} onNavigate={setSection} />}
      {section === "reports" && <ReportsSection data={data} onExport={exportCsv} />}
      {section === "settings" && <SettingsSection data={data} onLogout={() => void logout()} />}
      {toast && <div className="admin-toast" role="status">{toast}</div>}
    </main>
  </div>;
}

function DashboardSection({ data, upcoming, onNavigate }: { data: DashboardData; upcoming: Reservation[]; onNavigate: (section: Section) => void }) {
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Vista general</p><h2>Tu agenda en una mirada</h2><p>Los horarios se liberan gradualmente conforme se confirman los pagos.</p></div><span className="admin-live-dot" title="El panel revisa el estado cada 15 segundos">Sincronizado · 15 s</span></div><div className="admin-stat-grid"><StatCard label="Horarios programados" value={data.metrics.scheduledSlots} note="en todas las fechas" tone="neutral" /><StatCard label="Reservas registradas" value={data.metrics.reservations} note="con datos de cliente" tone="green" /><StatCard label="Horarios disponibles" value={data.metrics.availableSlots} note="pueden reservarse" tone="gold" /></div><div className="admin-card"><div className="admin-card-heading"><div><p className="admin-eyebrow">Agenda ordenada</p><h3>Próximas reservas</h3></div><button className="admin-text-button" onClick={() => onNavigate("reservations")}>Ver todas →</button></div>{upcoming.length ? <div className="admin-upcoming-list">{upcoming.map((reservation) => <ReservationMini key={reservation.reference} reservation={reservation} />)}</div> : <EmptyState>Aún no hay reservas registradas.</EmptyState>}</div><div className="admin-card"><div className="admin-card-heading"><div><p className="admin-eyebrow">Preventa</p><h3>{data.coupon.active ? "VIP activa" : "Preventa general"}</h3></div><span className={`admin-pill ${data.coupon.active ? "is-gold" : "is-muted"}`}>{data.coupon.active ? `${data.coupon.claimed}/${data.coupon.limit} usos` : "Código cerrado"}</span></div><p className="admin-card-copy">{data.coupon.active ? `NAVIDAD26 está disponible para los registrados. Quedan ${Math.max(data.coupon.limit - data.coupon.claimed, 0)} usos.` : "El código VIP y las fotos extra ya no están disponibles. La agenda opera con la tarifa general."}</p></div></div>;
}

function StatCard({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: "neutral" | "green" | "gold" }) {
  return <article className={`admin-stat-card tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ReservationMini({ reservation }: { reservation: Reservation }) {
  return <div className="admin-mini-row"><div className="admin-mini-date"><strong>{dateLabel(reservation.date)}</strong><span>{timeLabel(reservation.time)}</span></div><div className="admin-mini-client"><strong>{reservation.name}</strong><span>{reservation.people} personas · {reservation.photos} fotos</span></div><span className={`admin-pill ${stateClass(reservation.state)}`}>{stateLabel(reservation.state)}</span></div>;
}

function CalendarSection({ data }: { data: DashboardData }) {
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Agenda ordenada</p><h2>Fechas y horarios</h2><p>Consulta qué está libre, apartado o confirmado.</p></div><span className="admin-count">{data.metrics.scheduledSlots} horarios</span></div><div className="admin-calendar-grid">{data.calendar.map((date) => <article className="admin-day-card" key={date.iso}><header><span>□</span><div><strong>{date.weekday}</strong><small>{dateLabel(date.iso)}</small></div><em>{date.slots.filter((slot) => slot.available).length} libres</em></header><div className="admin-slot-list">{date.slots.map((slot) => <div className={`admin-slot ${slot.reservation ? "is-booked" : slot.status === "available" ? "is-available" : "is-closed"}`} key={slot.time}><span>◷ {timeLabel(slot.time)}</span>{slot.reservation ? <div><strong>{slot.reservation.name}</strong><small>{stateLabel(slot.reservation.state)} · {slot.reservation.people} personas</small></div> : <em>{slot.status === "available" ? "Disponible" : "Se libera con una reserva"}</em>}</div>)}</div></article>)}</div></div>;
}

function ReservationsSection({ data, reservations, search, setSearch, statusFilter, setStatusFilter, photoFilter, setPhotoFilter, saving, onSave, showNewReservation, onCloseNewReservation, onCreate }: { data: DashboardData; reservations: Reservation[]; search: string; setSearch: (value: string) => void; statusFilter: "all" | Reservation["state"]; setStatusFilter: (value: "all" | Reservation["state"]) => void; photoFilter: "all" | PhotoStatus; setPhotoFilter: (value: "all" | PhotoStatus) => void; saving: string; onSave: (reservation: Reservation, patch: { photoStatus?: PhotoStatus; adminNote?: string }) => Promise<void>; showNewReservation: boolean; onCloseNewReservation: () => void; onCreate: (payload: Record<string, unknown>) => Promise<void> }) {
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Vista general</p><h2>Clientes / Reservas</h2><p>Edita el estado de fotos y tus notas desde cada reserva.</p></div><span className="admin-count">{reservations.length} registros</span></div>{showNewReservation && <NewReservationForm data={data} saving={saving === "new"} onClose={onCloseNewReservation} onCreate={onCreate} />}<div className="admin-filters"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Todos los pagos</option><option value="paid">Pagadas</option><option value="held">Apartadas</option><option value="processing">Procesando</option><option value="expired">Expiradas</option></select><select value={photoFilter} onChange={(event) => setPhotoFilter(event.target.value as typeof photoFilter)}><option value="all">Todos los estados de fotos</option>{(Object.keys(photoStatusLabels) as PhotoStatus[]).map((status) => <option value={status} key={status}>{photoStatusLabels[status]}</option>)}</select><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, correo o referencia…" aria-label="Buscar reservas" /></div><div className="admin-card admin-table-card"><div className="admin-table-wrap">{reservations.length ? <table className="admin-table"><thead><tr><th>Fecha y estado</th><th>Cliente y contacto</th><th>Pagos</th><th>Fotos</th><th>Notas internas</th></tr></thead><tbody>{reservations.map((reservation) => <ReservationRow key={reservation.reference} reservation={reservation} saving={saving === reservation.reference} onSave={onSave} />)}</tbody></table> : <EmptyState>No encontramos reservas con esos filtros.</EmptyState>}</div></div></div>;
}

function NewReservationForm({ data, saving, onClose, onCreate }: { data: DashboardData; saving: boolean; onClose: () => void; onCreate: (payload: Record<string, unknown>) => Promise<void> }) {
  const firstDate = data.calendar.find((date) => date.slots.some((slot) => slot.available));
  const [date, setDate] = useState(firstDate?.iso ?? data.calendar[0]?.iso ?? "2026-10-21");
  const [time, setTime] = useState(firstDate?.slots.find((slot) => slot.available)?.time ?? "16:00");
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", people: "5" });
  const [error, setError] = useState("");
  const availableDates = data.calendar.filter((item) => item.slots.some((slot) => slot.available));
  const availableTimes = data.calendar.find((item) => item.iso === date)?.slots.filter((slot) => slot.available) ?? [];
  function changeDate(value: string) {
    setDate(value);
    const nextTime = data.calendar.find((item) => item.iso === value)?.slots.find((slot) => slot.available)?.time ?? "";
    setTime(nextTime);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!time) { setError("Elige un horario disponible."); return; }
    await onCreate({ date, time, ...form, people: Number(form.people), coupon: "" });
  }
  return <form className="admin-card admin-new-reservation" onSubmit={submit}><div className="admin-card-heading"><div><p className="admin-eyebrow">Registro manual</p><h3>Nueva reserva</h3></div><button type="button" className="admin-text-button" onClick={onClose}>Cerrar</button></div><div className="admin-new-grid"><label>Fecha<select value={date} onChange={(event) => changeDate(event.target.value)}>{availableDates.map((item) => <option value={item.iso} key={item.iso}>{item.weekday} {dateLabel(item.iso)}</option>)}</select></label><label>Horario<select value={time} onChange={(event) => setTime(event.target.value)}>{availableTimes.map((slot) => <option value={slot.time} key={slot.time}>{timeLabel(slot.time)}</option>)}</select></label><label className="admin-new-wide">Nombre del cliente<input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label>WhatsApp<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value.replace(/\D/g, "") }))} /></label><label>Correo<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label><label>Personas<select value={form.people} onChange={(event) => setForm((current) => ({ ...current, people: event.target.value }))}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label></div>{error && <p className="admin-error admin-error-light">{error}</p>}<div className="admin-new-actions"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Registrando…" : "Registrar reserva"}</button></div><p className="admin-form-hint">La reserva manual queda apartada para seguimiento. El pago se confirma desde Stripe.</p></form>;
}

function ReservationRow({ reservation, saving, onSave }: { reservation: Reservation; saving: boolean; onSave: (reservation: Reservation, patch: { photoStatus?: PhotoStatus; adminNote?: string }) => Promise<void> }) {
  const [note, setNote] = useState(reservation.adminNote);
  return <tr><td><strong>{dateLabel(reservation.date)}</strong><span>{timeLabel(reservation.time)}</span><small className={`admin-pill ${stateClass(reservation.state)}`}>{stateLabel(reservation.state)}</small><code>{reservation.reference}</code></td><td><strong>{reservation.name}</strong><span>{reservation.whatsapp}</span><a href={`mailto:${reservation.email}`}>{reservation.email}</a><small>{reservation.people} personas · {reservation.photos} fotos</small></td><td><span>Anticipo <b>{money(reservation.deposit)}</b></span><span>Total <b>{money(reservation.total)}</b></span><strong className={reservation.state === "paid" ? "admin-paid-text" : "admin-pending-text"}>{reservation.state === "paid" ? "Pagado" : `Saldo ${money(reservation.balance)}`}</strong></td><td><select value={reservation.photoStatus} disabled={saving} onChange={(event) => void onSave(reservation, { photoStatus: event.target.value as PhotoStatus })}>{(Object.keys(photoStatusLabels) as PhotoStatus[]).map((status) => <option value={status} key={status}>{photoStatusLabels[status]}</option>)}</select><small>{reservation.couponApplied ? "VIP · 7 fotos" : "General · 5 fotos"}</small></td><td><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Añade una nota…" maxLength={1200} /><button className="admin-small-button" disabled={saving || note === reservation.adminNote} onClick={() => void onSave(reservation, { adminNote: note })}>{saving ? "Guardando…" : "Guardar nota"}</button></td></tr>;
}

function PaymentsSection({ data }: { data: DashboardData }) {
  const payments = data.reservations.filter((reservation) => reservation.state === "paid" || reservation.state === "held" || reservation.state === "processing");
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Control financiero</p><h2>Pagos</h2><p>Anticipos recibidos y saldos pendientes de cada sesión.</p></div><span className="admin-pill is-green">{data.paymentMode === "stripe" ? "Stripe conectado" : data.paymentMode}</span></div><div className="admin-stat-grid admin-stat-grid-four"><StatCard label="Cobrado" value={money(data.metrics.collected)} note="anticipos pagados" tone="green" /><StatCard label="Por cobrar" value={money(data.metrics.pending)} note="saldos de sesiones" tone="gold" /><StatCard label="Pagadas" value={data.metrics.confirmed} note="reservas confirmadas" tone="neutral" /><StatCard label="Pendientes" value={payments.filter((r) => r.state !== "paid").length} note="requieren seguimiento" tone="gold" /></div><div className="admin-card"><div className="admin-card-heading"><div><p className="admin-eyebrow">Movimientos</p><h3>Resumen por reserva</h3></div></div>{payments.length ? <div className="admin-payment-list">{payments.map((reservation) => <div className="admin-payment-row" key={reservation.reference}><div><strong>{reservation.name}</strong><span>{dateLabel(reservation.date)} · {timeLabel(reservation.time)}</span></div><div><span>Anticipo</span><strong>{money(reservation.deposit)}</strong></div><div><span>Saldo</span><strong>{money(reservation.balance)}</strong></div><span className={`admin-pill ${stateClass(reservation.state)}`}>{stateLabel(reservation.state)}</span></div>)}</div> : <EmptyState>Aún no hay movimientos de pago.</EmptyState>}</div></div>;
}

function ExtrasSection({ data, total }: { data: DashboardData; total: number }) {
  const extraReservations = data.reservations.filter((reservation) => reservation.extraPeople > 0);
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Servicios adicionales</p><h2>Extras</h2><p>Personas adicionales y cargos agregados a las reservas.</p></div><span className="admin-count">{money(total)}</span></div><div className="admin-stat-grid"><StatCard label="Ingresos por extras" value={money(total)} note="personas adicionales" tone="gold" /><StatCard label="Reservas con extras" value={extraReservations.length} note="requieren atención" tone="neutral" /><StatCard label="Personas adicionales" value={extraReservations.reduce((sum, reservation) => sum + reservation.extraPeople, 0)} note="sobre el paquete base" tone="green" /></div><div className="admin-card"><div className="admin-card-heading"><div><p className="admin-eyebrow">Detalle</p><h3>Reservas con personas extra</h3></div></div>{extraReservations.length ? <div className="admin-payment-list">{extraReservations.map((reservation) => <div className="admin-payment-row" key={reservation.reference}><div><strong>{reservation.name}</strong><span>{dateLabel(reservation.date)} · {reservation.people} personas en total</span></div><div><span>Personas extra</span><strong>{reservation.extraPeople}</strong></div><div><span>Cargo</span><strong>{money(reservation.extraFee)}</strong></div><span className={`admin-pill ${stateClass(reservation.state)}`}>{stateLabel(reservation.state)}</span></div>)}</div> : <EmptyState>No hay cargos extra registrados.</EmptyState>}</div></div>;
}

function PhotosSection({ data, counts, onNavigate }: { data: DashboardData; counts: { status: PhotoStatus; count: number }[]; onNavigate: (section: Section) => void }) {
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Producción</p><h2>Fotos</h2><p>Da seguimiento a la edición y entrega de cada sesión.</p></div><span className="admin-count">{data.reservations.reduce((sum, reservation) => sum + reservation.photos, 0)} fotos</span></div><div className="admin-photo-status-grid">{counts.map(({ status, count }) => <button key={status} onClick={() => onNavigate("reservations")}><strong>{count}</strong><span>{photoStatusLabels[status]}</span></button>)}</div><div className="admin-card admin-photo-callout"><span>✦</span><div><h3>Actualiza cada entrega desde Reservas</h3><p>Selecciona Pendientes, En edición, Listas o Entregadas en la fila de cada cliente.</p></div><button className="admin-secondary-button" onClick={() => onNavigate("reservations")}>Ver reservas</button></div></div>;
}

function ReportsSection({ data, onExport }: { data: DashboardData; onExport: () => void }) {
  const paid = data.reservations.filter((reservation) => reservation.state === "paid");
  const byDate = data.calendar.map((date) => ({ ...date, count: date.slots.filter((slot) => slot.reservation?.state === "paid").length })).filter((date) => date.count > 0);
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Datos del estudio</p><h2>Reportes</h2><p>Descarga la información para tu seguimiento semanal.</p></div><button className="admin-primary-button" onClick={onExport}>↓ Descargar CSV</button></div><div className="admin-stat-grid"><StatCard label="Conversión pagada" value={data.reservations.length ? `${Math.round((paid.length / data.reservations.length) * 100)}%` : "0%"} note="de las reservas registradas" tone="green" /><StatCard label="Ticket promedio" value={paid.length ? money(Math.round(paid.reduce((sum, reservation) => sum + reservation.total, 0) / paid.length)) : money(0)} note="por sesión pagada" tone="gold" /><StatCard label="Fotos comprometidas" value={data.reservations.reduce((sum, reservation) => sum + reservation.photos, 0)} note="en las reservas actuales" tone="neutral" /></div><div className="admin-card"><div className="admin-card-heading"><div><p className="admin-eyebrow">Ritmo de reservas</p><h3>Sesiones confirmadas por fecha</h3></div></div>{byDate.length ? <div className="admin-bars">{byDate.map((date) => <div key={date.iso}><span style={{ height: `${Math.max(18, date.count * 28)}px` }} /><strong>{date.count}</strong><small>{date.day}</small></div>)}</div> : <EmptyState>Cuando lleguen reservas pagadas verás el ritmo por fecha.</EmptyState>}</div></div>;
}

function SettingsSection({ data, onLogout }: { data: DashboardData; onLogout: () => void }) {
  return <div className="admin-content"><div className="admin-section-heading"><div><p className="admin-eyebrow">Cuenta y acceso</p><h2>Configuración</h2><p>Estado de tu panel privado y de la conexión de pagos.</p></div></div><div className="admin-settings-grid"><div className="admin-card"><p className="admin-eyebrow">Acceso</p><h3>Control interno protegido</h3><p className="admin-card-copy">La sesión se mantiene activa por 7 días en este dispositivo. Puedes cerrar sesión cuando termines.</p><button className="admin-secondary-button" onClick={onLogout}>Cerrar sesión</button></div><div className="admin-card"><p className="admin-eyebrow">Pagos</p><h3>{data.paymentMode === "stripe" ? "Stripe conectado" : "Pagos en modo " + data.paymentMode}</h3><p className="admin-card-copy">Las reservas y los estados de pago se sincronizan desde el servidor.</p><span className="admin-pill is-green">Operativo</span></div><div className="admin-card"><p className="admin-eyebrow">Preventa</p><h3>{data.coupon.active ? "VIP activa" : "General activa"}</h3><p className="admin-card-copy">{data.coupon.active ? `Código ${data.coupon.code}: ${data.coupon.claimed} de ${data.coupon.limit} usos.` : "Código VIP cerrado y beneficio de fotos extra desactivado."}</p></div></div></div>;
}
