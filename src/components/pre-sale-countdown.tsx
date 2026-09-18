"use client";

import { useEffect, useState } from "react";

const VIP_PRE_SALE_END = "2026-09-25T23:59:59-06:00";
const GENERAL_PRE_SALE_END = "2026-10-05T23:59:59-06:00";
const VIP_PRE_SALE_END_MS = Date.parse(VIP_PRE_SALE_END);
const GENERAL_PRE_SALE_END_MS = Date.parse(GENERAL_PRE_SALE_END);

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
  const [remaining, setRemaining] = useState<Remaining>();

  useEffect(() => {
    const update = () => {
      const endMs = Date.now() < VIP_PRE_SALE_END_MS ? VIP_PRE_SALE_END_MS : GENERAL_PRE_SALE_END_MS;
      setRemaining(getRemaining(endMs));
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const vipActive = Date.now() < VIP_PRE_SALE_END_MS;
  const generalActive = !vipActive && (remaining?.total ?? 0) > 0;
  const ended = !vipActive && !generalActive;
  const units = [
    [pad(remaining?.days), "días"],
    [pad(remaining?.hours), "hrs"],
    [pad(remaining?.minutes), "min"],
    [pad(remaining?.seconds), "seg"],
  ];

  return (
    <aside className={`pre-sale-countdown${ended ? " is-ended" : ""}`} aria-label="Cuenta regresiva de la preventa">
      <p className="pre-sale-label">
        {ended ? "La preventa terminó" : vipActive ? "La preventa VIP termina en" : "La preventa general termina en"}
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
      <time className="pre-sale-date" dateTime={vipActive ? VIP_PRE_SALE_END : GENERAL_PRE_SALE_END}>
        {vipActive ? "25 SEP 2026 · 23:59" : "05 OCT 2026 · 23:59"}
      </time>
    </aside>
  );
}
