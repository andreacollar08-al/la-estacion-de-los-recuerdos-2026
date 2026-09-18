"use client";

import { useEffect, useRef, useState } from "react";

export default function SetVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const manuallyPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    function sync() {
      if (!video) return;
      if (inView && !document.hidden && !motion.matches && !manuallyPaused.current) {
        void video.play().catch(() => { /* The visible play control handles autoplay restrictions. */ });
      } else { video.pause(); }
    }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.1 });
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); motion.removeEventListener("change", sync); video.pause(); };
  }, []);

  function togglePlayback() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) { manuallyPaused.current = false; void video.play().catch(() => undefined); }
    else { manuallyPaused.current = true; video.pause(); }
  }

  return (
    <div className="set-video">
      <video ref={ref} autoPlay muted={muted} loop playsInline preload="metadata"
        aria-label="Recorrido en video por el set de La Estación de los Recuerdos"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
        <source src="/media/navidad-2026-set.mp4" type="video/mp4" />
        Tu navegador no puede reproducir este video.
      </video>
      <div className="video-controls">
        <button type="button" onClick={togglePlayback} aria-label={playing ? "Pausar video" : "Reproducir video"}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zm8 0h4v16h-4z" /> : <path d="m7 4 13 8-13 8z" />}</svg>
        </button>
        <button type="button" onClick={() => setMuted(!muted)} aria-pressed={!muted}>{muted ? "Activar sonido" : "Silenciar"}</button>
      </div>
    </div>
  );
}
