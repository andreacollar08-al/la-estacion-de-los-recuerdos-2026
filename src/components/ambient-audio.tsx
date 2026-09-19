"use client";

import { useEffect, useRef, useState } from "react";

const PREFERENCE_KEY = "la-estacion-ambient-music";

export default function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.34;

    let firstGesture: ((event: PointerEvent) => void) | undefined;
    const syncState = () => {
      const playing = !audio.paused && !audio.ended;
      setIsPlaying(playing);
      if (playing && firstGesture) document.removeEventListener("pointerdown", firstGesture);
    };
    const storedPreference = window.localStorage.getItem(PREFERENCE_KEY);
    const shouldStart = storedPreference !== "off";

    const tryStart = () => {
      if (!shouldStart || !audio.paused) return;
      void audio.play().catch(() => undefined);
    };

    if (shouldStart) {
      tryStart();
      firstGesture = (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(".ambient-audio")) return;
        tryStart();
      };
      document.addEventListener("pointerdown", firstGesture, { passive: true });
    }

    audio.addEventListener("play", syncState);
    audio.addEventListener("pause", syncState);
    audio.addEventListener("ended", syncState);

    return () => {
      if (firstGesture) document.removeEventListener("pointerdown", firstGesture);
      audio.removeEventListener("play", syncState);
      audio.removeEventListener("pause", syncState);
      audio.removeEventListener("ended", syncState);
      audio.pause();
    };
  }, []);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().then(() => {
        window.localStorage.setItem(PREFERENCE_KEY, "on");
      }).catch(() => undefined);
    } else {
      audio.pause();
      window.localStorage.setItem(PREFERENCE_KEY, "off");
    }
  }

  return (
    <div className={`ambient-audio${isPlaying ? " is-playing" : ""}`}>
      <audio ref={audioRef} loop preload="metadata" aria-label="Música ambiental de La Estación de los Recuerdos">
        <source src="/media/navidad-soundtrack.m4a" type="audio/mp4" />
        Tu navegador no puede reproducir esta música.
      </audio>
      <button
        className="ambient-audio-toggle"
        type="button"
        onClick={toggleAudio}
        aria-label={isPlaying ? "Pausar música ambiental" : "Activar música ambiental"}
        aria-pressed={isPlaying}
      >
        <svg className="ambient-audio-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10v4h3l5 4V6l-5 4H4Z" />
          {isPlaying ? <><path d="M16 9.5a4 4 0 0 1 0 5" /><path d="M19 7a8 8 0 0 1 0 10" /></> : <path d="m16 9 5 6" />}
        </svg>
      </button>
    </div>
  );
}
