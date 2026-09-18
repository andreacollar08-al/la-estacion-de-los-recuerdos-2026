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
  return (
    <p>
      <strong>{phase === "vip" ? "NAVIDAD26" : "PREVENTA GENERAL"}</strong>{" "}
      {phase === "vip" ? "$200 menos + 2 fotos extra · primeros 10 usos" : "$1,800 · 5 fotos editadas"}
    </p>
  );
}

export function PreSaleSeasonNote() {
  const phase = usePresalePhase();
  return (
    <p className="season-note">
      <strong>{phase === "vip" ? "Oferta VIP" : "Preventa general"}</strong>{" "}
      {phase === "vip" ? "NAVIDAD26: $1,600 · 7 fotos · primeros 10 usos" : "$1,800 · 5 fotos editadas"}
    </p>
  );
}

export function PreSaleBenefit() {
  const phase = usePresalePhase();
  const vip = phase === "vip";
  return (
    <div className="vip-note">
      <p><strong>{vip ? "Beneficio VIP" : "Preventa general"}</strong><span>{vip ? <>Con <b>NAVIDAD26</b>: $1,600 y 2 fotos extra.</> : "$1,800 por sesión con 5 fotos editadas."}</span></p>
      <small>{vip ? "Primeros 10 usos · Apartas con $800" : "Aparta con el 50% · código VIP no disponible"}</small>
    </div>
  );
}
