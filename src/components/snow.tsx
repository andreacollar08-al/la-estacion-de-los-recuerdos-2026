"use client";

import { useEffect, useRef, useState } from "react";

export default function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    const flakes = Array.from({ length: 24 }, (_, i) => ({ x: Math.random(), y: Math.random(), radius: 1 + Math.random() * 2.5, crystal: i % 4 === 0 }));
    function resize() {
      if (!canvas || !ctx) return;
      const scale = Math.min(window.devicePixelRatio, 2);
      canvas.width = innerWidth * scale;
      canvas.height = innerHeight * scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    function draw(time: number) {
      if (!ctx) return;
      const delta = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#fff8e9";
      ctx.strokeStyle = "#fff8e9";
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = "#211912";
      ctx.shadowBlur = 2;
      for (const flake of flakes) {
        flake.y = (flake.y + delta * 0.000025) % 1;
        ctx.save();
        ctx.translate(flake.x * innerWidth, flake.y * innerHeight);
        ctx.beginPath();
        if (flake.crystal) {
          for (let arm = 0; arm < 6; arm++) {
            const angle = arm * Math.PI / 3;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * flake.radius * 1.6, Math.sin(angle) * flake.radius * 1.6);
          }
          ctx.stroke();
        } else { ctx.arc(0, 0, flake.radius / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    }
    function sync() {
      cancelAnimationFrame(frame);
      previous = 0;
      ctx?.clearRect(0, 0, innerWidth, innerHeight);
      if (!paused && !motion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    }
    resize(); sync();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
  }, [paused]);
  return <><canvas ref={ref} className="snow-canvas" aria-hidden="true" /><button className="snow-toggle" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Activar nieve" : "Pausar nieve"}</button></>;
}
