"use client";

import { useEffect, useState } from "react";
import { GENERAL_PRE_SALE_END, isVipPresaleActive, VIP_PRE_SALE_END, VIP_PRE_SALE_END_MS } from "@/lib/booking-config";

const GENERAL_PRE_SALE_END_MS = Date.parse(GENERAL_PRE_SALE_END);

export type PresalePhase = "vip" | "general" | "ended";

export function getPresalePhase(now = Date.now()): PresalePhase {
  if (isVipPresaleActive(now)) return "vip";
  if (now < GENERAL_PRE_SALE_END_MS) return "general";
  return "ended";
}

export function usePresalePhase() {
  const [phase, setPhase] = useState<PresalePhase>();

  useEffect(() => {
    const update = () => setPhase(getPresalePhase());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return phase ?? "vip";
}

function useVipSpacesRemaining() {
  const [remaining, setRemaining] = useState(10);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/availability", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { coupon?: { claimed?: number; limit?: number } };
        const limit = Math.max(0, data.coupon?.limit ?? 10);
        const claimed = Math.max(0, data.coupon?.claimed ?? 0);
        if (active) setRemaining(Math.max(0, limit - claimed));
      } catch {
        // Keep the last known count if availability is briefly unavailable.
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return remaining;
}

type Remaining = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getRemaining(endMs: number): Remaining {
  const total = Math.max(endMs - Date.now(), 0);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  return { total, days, hours, minutes, seconds };
}

function pad(value: number | undefined) {
  return value === undefined ? "--" : String(value).padStart(2, "0");
}

export default function PreSaleCountdown() {
  const phase = usePresalePhase();
  const end = phase === "vip" ? VIP_PRE_SALE_END : GENERAL_PRE_SALE_END;
  const endMs = phase === "vip" ? VIP_PRE_SALE_END_MS : GENERAL_PRE_SALE_END_MS;
  const remaining = phase === "ended" ? undefined : getRemaining(endMs);
  const ended = phase === "ended";
  const units = [
    [pad(remaining?.days), "días"],
    [pad(remaining?.hours), "hrs"],
    [pad(remaining?.minutes), "min"],
    [pad(remaining?.seconds), "seg"],
  ];

  return (
    <aside className={`pre-sale-countdown${ended ? " is-ended" : ""}`} aria-label="Cuenta regresiva de la preventa">
      <p className="pre-sale-label">
        {ended ? "La preventa terminó" : phase === "vip" ? "La preventa VIP termina en" : "La preventa general termina en"}
      </p>
      {!ended && (
        <div className="pre-sale-grid" role="timer" aria-live="polite" aria-atomic="true">
          {units.map(([value, label]) => (
            <span className="pre-sale-unit" key={label}>
              <strong>{value}</strong>
              <small>{label}</small>
            </span>
          ))}
        </div>
      )}
      <time className="pre-sale-date" dateTime={end}>
        {phase === "vip" ? "25 SEP 2026 · 23:59" : "05 OCT 2026 · 23:59"}
      </time>
    </aside>
  );
}

export function PreSaleOffer() {
  const phase = usePresalePhase();
  const spaces = useVipSpacesRemaining();
  return (
    <p className={phase === "vip" ? "is-vip-offer" : undefined}>
      <strong>{phase === "vip" ? "Cupón VIP sorpresa" : "PREVENTA GENERAL"}</strong>
      {phase === "vip" ? <span className="vip-spaces">Quedan <b>{spaces}</b> espacios con el cupón VIP · limitado a 10 lugares.</span> : <span>$1,800 · 5 fotos editadas</span>}
    </p>
  );
}

export function PreSaleSeasonNote() {
  const phase = usePresalePhase();
  return (
    <p className="season-note">
      <strong>{phase === "vip" ? "Cupón VIP sorpresa" : "Preventa general"}</strong>{" "}
      {phase === "vip" ? <><span>Lugares limitados para familias registradas · máximo 10</span><span className="season-coupon-code">Código: NAVIDAD26</span></> : "$1,800 · 5 fotos editadas"}
    </p>
  );
}

export function PreSaleBenefit() {
  const phase = usePresalePhase();
  const vip = phase === "vip";
  return (
    <div className="vip-note">
      <p><strong>{vip ? "Cupón VIP sorpresa" : "Preventa general"}</strong><span>{vip ? "Lugares limitados para familias registradas." : "$1,800 por sesión con 5 fotos editadas."}</span></p>
      <small>{vip ? "Limitado a 10 lugares · Aparta con el 50%" : "Aparta con el 50% · código VIP no disponible"}</small>
    </div>
  );
}
