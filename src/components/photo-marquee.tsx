"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

export type MarqueePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type PhotoMarqueeProps = {
  photos: MarqueePhoto[];
};

function CloseIcon() {
  return (
    <svg className="photo-lightbox-close-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function PhotoCard({
  photo,
  duplicate,
  onOpen,
  onTouchStart,
  onTouchEnd,
}: {
  photo: MarqueePhoto;
  duplicate: boolean;
  onOpen: (photo: MarqueePhoto, event: MouseEvent<HTMLButtonElement>) => void;
  onTouchStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onTouchEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="photo-marquee-card"
      type="button"
      aria-label={`Ver fotografía: ${photo.alt}`}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      onClick={(event) => onOpen(photo, event)}
      onPointerDown={onTouchStart}
      onPointerUp={onTouchEnd}
      onPointerCancel={onTouchEnd}
      onPointerLeave={onTouchEnd}
    >
      <Image
        src={photo.src}
        alt={duplicate ? "" : photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(max-width: 760px) 64vw, 260px"
        loading="eager"
      />
      <span className="photo-marquee-card-hint" aria-hidden="true">Ver foto</span>
    </button>
  );
}

function PhotoRow({
  photos,
  reverse,
  onOpen,
  onTouchStart,
  onTouchEnd,
}: {
  photos: MarqueePhoto[];
  reverse?: boolean;
  onOpen: (photo: MarqueePhoto, event: MouseEvent<HTMLButtonElement>) => void;
  onTouchStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onTouchEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="photo-marquee-row">
      <div className={`photo-marquee-track${reverse ? " photo-marquee-track-reverse" : ""}`}>
        <div className="photo-marquee-group">
          {photos.map((photo) => <PhotoCard key={photo.src} photo={photo} duplicate={false} onOpen={onOpen} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />)}
        </div>
        <div className="photo-marquee-group" aria-hidden="true">
          {photos.map((photo) => <PhotoCard key={`${photo.src}-duplicate`} photo={photo} duplicate onOpen={onOpen} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />)}
        </div>
      </div>
    </div>
  );
}

export default function PhotoMarquee({ photos }: PhotoMarqueeProps) {
  const [activePhoto, setActivePhoto] = useState<MarqueePhoto | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const firstRow = photos.slice(0, Math.ceil(photos.length / 2));
  const secondRow = photos.slice(Math.ceil(photos.length / 2));

  useEffect(() => {
    if (!activePhoto) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePhoto(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [activePhoto]);

  function openPhoto(photo: MarqueePhoto) {
    setActivePhoto(photo);
  }

  function handleTouchStart(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") setIsTouching(true);
  }

  function handleTouchEnd(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "touch") setIsTouching(false);
  }

  return (
    <>
      <div className={`photo-marquee${isTouching ? " is-touching" : ""}`} aria-label="Galería de fotografías del set">
        <p className="photo-marquee-instruction">Toca una foto para verla completa</p>
        <div className="photo-marquee-viewport">
          <PhotoRow photos={firstRow} onOpen={openPhoto} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
          <PhotoRow photos={secondRow} reverse onOpen={openPhoto} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
          <span className="photo-marquee-fade photo-marquee-fade-left" aria-hidden="true" />
          <span className="photo-marquee-fade photo-marquee-fade-right" aria-hidden="true" />
        </div>
      </div>

      {activePhoto && (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Fotografía ampliada: ${activePhoto.alt}`} onClick={(event) => { if (event.target === event.currentTarget) setActivePhoto(null); }}>
          <div className="photo-lightbox-panel">
            <button className="photo-lightbox-close" type="button" aria-label="Cerrar fotografía" onClick={() => setActivePhoto(null)} ref={closeButtonRef}>
              <CloseIcon />
            </button>
            <Image src={activePhoto.src} alt={activePhoto.alt} width={activePhoto.width} height={activePhoto.height} sizes="min(92vw, 900px)" priority />
          </div>
        </div>
      )}
    </>
  );
}
