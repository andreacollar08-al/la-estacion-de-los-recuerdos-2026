import Image from "next/image";
import BookingForm from "@/components/booking-form";
import SetVideo from "@/components/set-video";
import Snow from "@/components/snow";
import { BorderBeam, ScrollExpand, ShinyText, TiltedCard } from "@/components/visual-effects";

const faqs = [
  ["¿Cómo se paga?", "Apartas con el 50% no reembolsable. El resto se liquida en efectivo el día de la sesión. Con NAVIDAD26, el anticipo es de $800 y el saldo de $800."],
  ["¿Quiénes pueden venir?", "Incluye hasta 5 personas de tu núcleo familiar directo. Desde la sexta, cada persona extra suma $200 MXN al total y al anticipo del 50%."],
  ["¿Cómo recibo mis fotos?", "En una galería digital privada, editadas y en alta resolución. La fecha de entrega se confirma con el estudio."],
  ["¿Puedo elegir más fotografías el día de mi sesión?", "Sí. Puedes agregar fotografías el día de tu sesión: el costo depende de la cantidad y puedes elegir imágenes individuales o la galería completa. Todo adicional tiene un costo extra."],
  ["¿Puedo cambiar la fecha?", "El anticipo no es reembolsable. Incluye un cambio de fecha sin costo, sujeto a disponibilidad de la agenda, dentro del mismo mes y temporada. Un segundo cambio cuesta $900 MXN dentro de la misma temporada; para otra temporada se ajusta el precio según su tarifa vigente."],
  ["¿Qué pasa si cancelo mi sesión o no puedo asistir en la fecha?", "Sí puedes cancelar, pero el anticipo no es reembolsable. También puedes solicitar el cambio de fecha incluido, sujeto a la disponibilidad de la agenda. Si después necesitas otro cambio, aplica el costo de $900 MXN dentro de la misma temporada."],
  ["¿Dónde es la sesión?", "En Rubiel Photo Art, Palenque, Chiapas. Recibirás la dirección y las indicaciones al confirmar tu reserva."],
];

function ArrowIcon() {
  return <svg className="icon icon-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>;
}

function PlusIcon() {
  return <svg className="icon icon-plus" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function PinIcon() {
  return <svg className="micro-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
}

function PeopleIcon() {
  return <svg className="micro-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5" /><path d="M15.5 6.5a2.5 2.5 0 0 1 0 5M16 14c2.6.3 4.1 1.8 4.5 4" /></svg>;
}

function FeatureIcon({ type }: { type: "set" | "camera" | "heart" }) {
  if (type === "camera") return <svg className="feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 10h4l2-3h6l2 3h4v13H7V10Z" /><circle cx="16" cy="16.5" r="4.2" /><path d="M24 13h.1" /></svg>;
  if (type === "heart") return <svg className="feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 26S5 19.5 5 11.8C5 8.5 7.3 6 10.6 6c2.3 0 4.3 1.2 5.4 3 1.1-1.8 3.1-3 5.4-3C24.7 6 27 8.5 27 11.8 27 19.5 16 26 16 26Z" /></svg>;
  return <svg className="feature-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5" y="7" width="22" height="18" rx="1" /><path d="M9 11h14M9 15h8M9 19h14" /></svg>;
}

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#reserva">Ir a la reserva</a>

      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Rubiel Photo Art, inicio">
          <span className="brand-name">RUBIEL</span>
          <span className="brand-sub">PHOTO ART</span>
        </a>
        <a className="menu-toggle" href="#reserva" aria-label="Ir a reservar">
          <span /><span /><span />
        </a>
      </header>

      <main id="inicio">
        <section className="hero" aria-labelledby="campaign-title">
          <div className="hero-photo">
            <Image
              src="/media/navidad-2026-maquinistas.jpg"
              alt="Dos pequeños maquinistas con maletas junto a la locomotora nevada del set de Navidad"
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="hero-copy">
            <p className="hero-meta">Navidad 2026 <span aria-hidden="true">·</span> Palenque, Chiapas</p>
            <h1 id="campaign-title"><ShinyText className="shiny-title">La Estación</ShinyText><br /><ShinyText className="shiny-title shiny-title-emphasis">de los Recuerdos</ShinyText></h1>
            <p className="hero-lead">Una experiencia<br />fotográfica para que la Navidad<br />vuelva a empezar.</p>
            <p className="hero-description">Sube a bordo, juega a ser maquinista y llévate 5 recuerdos editados para volver a ellos cada diciembre.</p>
            <a className="button button-wine hero-action" href="#reserva">Reserva tu sesión <ArrowIcon /></a>
            <p className="hero-note">Anticipo del 50% · Fechas limitadas · Cupos por horario</p>
            <p className="hero-offer"><strong>NAVIDAD26</strong> $200 menos + 2 fotos extra · primeros 10 usos</p>
          </div>
          <div className="hero-footer" aria-label="Información de la experiencia">
            <span><PinIcon /> Palenque, Chiapas</span>
            <span><PeopleIcon /> Cupos limitados</span>
          </div>
        </section>

        <section className="family-intro section-shell" id="familia" aria-labelledby="family-title">
          <div className="family-copy">
            <p className="section-label">Más que fotos</p>
            <h2 id="family-title">Es tiempo<br /><em>en familia.</em></h2>
            <p className="section-lead">Una experiencia inmersiva para detener el tiempo, disfrutar el presente y guardar para siempre lo más importante: estar juntos.</p>
          </div>
          <figure className="instant-photo">
            <TiltedCard className="instant-frame"><Image src="/media/navidad-2026-anden.jpg" alt="Niño con vestuario de época en el andén, entre maletas antiguas y una locomotora con vapor" width={1280} height={853} sizes="(max-width: 760px) 48vw, 22vw" priority /></TiltedCard>
            <figcaption>Pequeños momentos.<br /><em>Grandes historias.</em></figcaption>
          </figure>
        </section>

        <section className="feature-strip" aria-label="Lo que incluye la experiencia">
          <div><FeatureIcon type="set" /><strong>20 minutos</strong><span>sesión guiada</span></div>
          <div><FeatureIcon type="camera" /><strong>5 fotos</strong><span>editadas en alta</span></div>
          <div><FeatureIcon type="heart" /><strong>Hasta 5</strong><span>personas incluidas</span></div>
        </section>

        <section className="seasons section-shell" aria-labelledby="seasons-title">
          <div className="section-heading">
            <p className="section-label">Elige cuándo quieres viajar</p>
            <h2 id="seasons-title">Temporadas<br /><em>y precios.</em></h2>
            <p>Octubre es la temporada abierta. Elige tu fecha antes de que se complete.</p>
          </div>
          <div className="season-grid">
            <article className="season-card season-card-active">
              <BorderBeam duration={7} size={82} colorFrom="#e7c994" colorTo="#7b2529" />
              <div className="season-card-top"><span className="season-badge">Mejor precio</span><span>Octubre</span></div>
              <small>21–24 · 28–31 OCT 2026</small>
              <strong>$1,800 <small>MXN</small></strong>
              <p>por sesión · aparta con el 50%</p>
              <a href="#reserva" className="season-link">Ver fechas <ArrowIcon /></a>
            </article>
            <article className="season-card season-card-locked" aria-label="Noviembre, próximamente">
              <div className="season-card-top"><span>Noviembre</span><span aria-hidden="true">—</span></div>
              <small>PRÓXIMAMENTE</small>
              <strong>Tu próxima salida</strong>
              <p>Fechas y tarifa por anunciar</p>
              <span className="season-link season-link-disabled">Próximamente</span>
            </article>
            <article className="season-card season-card-locked" aria-label="Diciembre, próximamente">
              <div className="season-card-top"><span>Diciembre</span><span aria-hidden="true">—</span></div>
              <small>PRÓXIMAMENTE</small>
              <strong>Tu próxima salida</strong>
              <p>Fechas y tarifa por anunciar</p>
              <span className="season-link season-link-disabled">Próximamente</span>
            </article>
          </div>
          <p className="season-note"><strong>Oferta VIP</strong> NAVIDAD26: $1,600 · 7 fotos · primeros 10 usos</p>
        </section>

        <section className="memory-band" aria-label="La Estación de los Recuerdos">
          <Image src="/media/navidad-2026-anden.jpg" alt="Locomotora del set navideño entre luces y maletas" fill sizes="100vw" />
          <div><p>Los niños creen.<br />Las familias cambian.<br /><em>Los recuerdos se quedan.</em></p></div>
        </section>

        <section className="station section-shell" id="paquete" aria-labelledby="station-title">
          <div className="station-heading">
            <p className="section-label">Conoce la estación</p>
            <h2 id="station-title">El set donde<br /><em>comienza la historia.</em></h2>
          </div>
          <div className="station-rail">
            <figure className="station-tile station-tile-wide">
              <Image src="/media/navidad-2026-maquinistas.jpg" alt="Set navideño con la locomotora y los pequeños maquinistas" width={1280} height={837} sizes="(max-width: 760px) 90vw, 24vw" />
            </figure>
            <figure className="station-tile station-tile-small">
              <Image src="/media/navidad-2026-anden.jpg" alt="Andén victoriano del set navideño" width={1280} height={853} sizes="(max-width: 760px) 44vw, 18vw" />
            </figure>
            <figure className="station-tile station-tile-small station-tile-last">
              <Image src="/media/navidad-2026-maquinistas.jpg" alt="Detalle de la locomotora y el andén navideño" width={1280} height={837} sizes="(max-width: 760px) 44vw, 18vw" />
            </figure>
          </div>
          <ScrollExpand className="station-video-expand">
            <div className="scroll-expand-media"><SetVideo /></div>
          </ScrollExpand>
          <a className="button button-wine gallery-cta" href="#reserva">Ver la experiencia completa <ArrowIcon /></a>
        </section>

        <section className="experience section-shell" aria-labelledby="package-title">
          <div className="package-copy">
            <p className="section-label">Lo que vas a vivir</p>
            <h2 id="package-title">Todo listo<br /><em>para abordar.</em></h2>
            <p className="section-lead">Una sesión breve, guiada y cuidada en cada detalle para que sólo tengas que llegar y disfrutar.</p>
            <ul className="package-list">
              <li><span>01</span>Sesión guiada por Rubiel Photo Art</li>
              <li><span>02</span>Set victoriano con locomotora y vapor</li>
              <li><span>03</span>5 fotos retocadas en alta resolución</li>
              <li><span>04</span>Galería privada para descargar</li>
            </ul>
            <div className="vip-note"><p><strong>Beneficio VIP</strong><span>Con <b>NAVIDAD26</b>: $1,600 y 2 fotos extra.</span></p><small>Primeros 10 usos · Apartas con $800</small></div>
          </div>
          <figure className="story-polaroid">
            <div className="story-frame"><Image src="/media/navidad-2026-anden.jpg" alt="Pequeño viajero listo para abordar el tren de los recuerdos" width={1280} height={853} sizes="(max-width: 760px) 52vw, 27vw" /></div>
            <figcaption>Un viaje que<br /><em>se queda contigo.</em></figcaption>
          </figure>
        </section>

        <section className="booking-section" id="reserva" aria-labelledby="booking-title">
          <div className="section-shell booking-layout">
            <div className="booking-intro">
              <p className="section-label">Reserva tu viaje</p>
              <h2 id="booking-title">Elige tu salida.</h2>
              <p className="section-lead">Octubre 2026 · 21–24 y 28–31</p>
              <p className="booking-policy">Anticipo del 50% no reembolsable.<br />Saldo en efectivo el día de la sesión.<br />1 cambio gratis dentro del mismo mes y temporada.</p>
              <div className="upcoming" aria-label="Próximas temporadas"><span>Noviembre <small>Próximamente</small></span><span>Diciembre <small>Próximamente</small></span></div>
            </div>
            <BookingForm />
          </div>
        </section>

        <section className="faq section-shell" aria-labelledby="faq-title">
          <div><p className="section-label">Preguntas frecuentes</p><h2 id="faq-title">¿Tienes<br /><em>dudas?</em></h2></div>
          <div className="faq-list">{faqs.map(([question, answer]) => (
            <details key={question}><summary>{question}<PlusIcon /></summary><p>{answer}</p></details>
          ))}</div>
        </section>

        <section className="final-cta" aria-label="Reserva tu sesión">
          <Image src="/media/navidad-2026-maquinistas.jpg" alt="La locomotora nevada de La Estación de los Recuerdos" fill sizes="100vw" />
          <div><p>Un viaje comienza.<br /><em>Un recuerdo queda.</em></p><a className="button button-wine" href="#reserva">Reserva tu sesión <ArrowIcon /></a></div>
        </section>
      </main>

      <footer className="site-footer">
        <div><span className="brand-name">RUBIEL</span><p>PHOTO ART · Palenque, Chiapas</p></div>
        <Snow />
        <small>© 2026 Rubiel Photo Art</small>
      </footer>
    </>
  );
}
