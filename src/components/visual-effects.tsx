"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

type ShinyTextProps = {
  children: ReactNode;
  className?: string;
};

export function ShinyText({ children, className = "" }: ShinyTextProps) {
  return <span className={`shiny-text ${className}`.trim()}>{children}</span>;
}

type TiltedCardProps = {
  children: ReactNode;
  className?: string;
};

export function TiltedCard({ children, className = "" }: TiltedCardProps) {
  const [transform, setTransform] = useState("perspective(900px) rotateX(0deg) rotateY(0deg)");

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    const rotateX = (-y * 9).toFixed(2);
    const rotateY = (x * 11).toFixed(2);
    setTransform(`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  }

  return (
    <div
      className={`tilted-card ${className}`.trim()}
      style={{ transform }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTransform("perspective(900px) rotateX(0deg) rotateY(0deg)")}
    >
      {children}
    </div>
  );
}

type ScrollExpandProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollExpand({ children, className = "" }: ScrollExpandProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const currentSection = section;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;

    function update() {
      frame = null;
      if (motionQuery.matches) {
        setProgress(1);
        return;
      }
      const bounds = currentSection.getBoundingClientRect();
      const start = window.innerHeight * 0.9;
      const end = window.innerHeight * 0.24;
      const next = Math.max(0, Math.min(1, (start - bounds.top) / (start - end)));
      setProgress((current) => Math.abs(current - next) > 0.008 ? next : current);
    }

    function requestUpdate() {
      if (frame === null) frame = window.requestAnimationFrame(update);
    }

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    motionQuery.addEventListener("change", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motionQuery.removeEventListener("change", requestUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scale = 0.58 + progress * 0.42;
  const radius = Math.round(28 * (1 - progress));
  const frameStyle = { transform: `scale(${scale})`, borderRadius: `${radius}px` };

  return (
    <div ref={sectionRef} className={`scroll-expand ${className}`.trim()}>
      <div className="scroll-expand-frame" style={frameStyle}>
        <div className="scroll-expand-content">{children}</div>
      </div>
    </div>
  );
}

type BorderBeamProps = {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  duration?: number;
  size?: number;
  borderWidth?: number;
};

export function BorderBeam({
  className = "",
  colorFrom = "#e7c994",
  colorTo = "#7b2529",
  duration = 7,
  size = 78,
  borderWidth = 1,
}: BorderBeamProps) {
  const style = {
    "--border-beam-color-from": colorFrom,
    "--border-beam-color-to": colorTo,
    "--border-beam-duration": `${duration}s`,
    "--border-beam-size": `${size}deg`,
    "--border-beam-width": `${borderWidth}px`,
  } as CSSProperties;

  return <span className={`border-beam ${className}`.trim()} style={style} aria-hidden="true" />;
}

type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  gravity?: number;
  ticks?: number;
  scalar?: number;
  origin?: { x: number; y: number };
  colors?: string[];
};

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  gravity: number;
  color: string;
};

export type ConfettiRef = {
  fire: (options?: ConfettiOptions) => void;
};

const defaultConfettiColors = ["#7b2529", "#e7c994", "#fffaf2", "#1b4035"];

export const Confetti = forwardRef<ConfettiRef, { className?: string }>(function Confetti({ className = "" }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const frameRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => undefined);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const contextElement = canvasElement?.getContext("2d");
    if (!canvasElement || !contextElement) return;
    const canvas = canvasElement;
    const context = contextElement;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function syncMotionPreference() {
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    drawRef.current = () => {
      const particles = particlesRef.current;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= 1;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.spin;

        if (particle.life <= 0 || particle.y > window.innerHeight + 36) {
          particles.splice(index, 1);
          continue;
        }

        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = Math.min(1, particle.life / (particle.maxLife * 0.24));
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.62);
        context.restore();
      }

      if (particles.length > 0) {
        frameRef.current = window.requestAnimationFrame(() => drawRef.current());
      } else {
        frameRef.current = null;
      }
    };

    resize();
    syncMotionPreference();
    window.addEventListener("resize", resize);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", syncMotionPreference);

    return () => {
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", syncMotionPreference);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      particlesRef.current = [];
      frameRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    fire(options = {}) {
      if (reduceMotionRef.current || !canvasRef.current) return;

      const {
        particleCount = 96,
        spread = 72,
        startVelocity = 11,
        gravity = 0.22,
        ticks = 105,
        scalar = 1,
        origin = { x: 0.5, y: 0.56 },
        colors = defaultConfettiColors,
      } = options;
      const originX = window.innerWidth * origin.x;
      const originY = window.innerHeight * origin.y;
      const spreadRadians = (spread * Math.PI) / 180;

      for (let index = 0; index < particleCount; index += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRadians;
        const velocity = startVelocity * (0.68 + Math.random() * 0.62);
        particlesRef.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: (5 + Math.random() * 5) * scalar,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.34,
          life: ticks * (0.76 + Math.random() * 0.3),
          maxLife: ticks,
          gravity,
          color: colors[index % colors.length],
        });
      }

      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(() => drawRef.current());
    },
  }), []);

  return <canvas ref={canvasRef} className={`confetti-canvas ${className}`.trim()} aria-hidden="true" />;
});

Confetti.displayName = "Confetti";
