"use client";

import { useEffect, useState } from "react";

const PRE_SALE_END = "2026-10-20T23:59:59-06:00";
const PRE_SALE_END_MS = Date.parse(PRE_SALE_END);

type Remaining = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getRemaining(): Remaining {
  const total = Math.max(PRE_SALE_END_MS - Date.now(), 0);
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
    const update = () => setRemaining(getRemaining());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const ended = remaining?.total === 0;
  const units = [
    [pad(remaining?.days), "días"],
    [pad(remaining?.hours), "hrs"],
    [pad(remaining?.minutes), "min"],
    [pad(remaining?.seconds), "seg"],
  ];

  return (
    <aside className={`pre-sale-countdown${ended ? " is-ended" : ""}`} aria-label="Cuenta regresiva de la preventa">
      <p className="pre-sale-label">{ended ? "La preventa terminó" : "La preventa termina en"}</p>
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
      <time className="pre-sale-date" dateTime={PRE_SALE_END}>20 OCT 2026 · 23:59</time>
    </aside>
  );
}
