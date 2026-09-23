import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HERO_IMAGE, SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | Rubiel Photo Art`,
  },
  description:
    "Reserva tu mini sesión fotográfica navideña 2026 en Palenque, Chiapas. Un set victoriano con locomotora, vapor y 5 fotos editadas para guardar la Navidad en familia.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  keywords: [
    "mini sesiones navideñas Palenque",
    "sesiones fotográficas navideñas Chiapas",
    "fotografía familiar Navidad 2026",
    "Rubiel Photo Art",
  ],
  authors: [{ name: "Rubiel Photo Art" }],
  creator: "Rubiel Photo Art",
  publisher: "Rubiel Photo Art",
  category: "photography",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "La Estación de los Recuerdos · Navidad 2026",
    description: "Mini sesiones navideñas en Palenque, Chiapas · 21–24 y 28–31 de octubre · Locomotora, vapor y 5 fotos editadas.",
    type: "website",
    url: SITE_URL,
    siteName: "Rubiel Photo Art",
    locale: "es_MX",
    images: [{
      url: SHARE_IMAGE,
      secureUrl: SHARE_IMAGE,
      type: "image/jpeg",
      width: 1280,
      height: 853,
      alt: "La Estación de los Recuerdos · familia en la locomotora · Navidad 2026",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "La Estación de los Recuerdos · Navidad 2026",
    description: "Mini sesiones navideñas en Palenque, Chiapas · 21–24 y 28–31 de octubre · 5 fotos editadas.",
    images: [{
      url: SHARE_IMAGE,
      secureUrl: SHARE_IMAGE,
      type: "image/jpeg",
      width: 1280,
      height: 853,
      alt: "La Estación de los Recuerdos · familia en la locomotora · Navidad 2026",
    }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "Rubiel Photo Art",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}#service`,
      name: "La Estación de los Recuerdos",
      url: `${SITE_URL}/#reserva`,
      image: HERO_IMAGE,
      description: "Mini sesiones fotográficas navideñas 2026 con set victoriano, locomotora y vapor en Palenque, Chiapas.",
      areaServed: {
        "@type": "City",
        name: "Palenque",
        containedInPlace: { "@type": "State", name: "Chiapas", containedInPlace: { "@type": "Country", name: "México" } },
      },
      serviceType: "Sesión fotográfica familiar navideña",
      provider: { "@id": `${SITE_URL}#organization` },
      offers: {
        "@type": "Offer",
        name: "Precio de preventa · La Estación de los Recuerdos",
        url: `${SITE_URL}/#reserva`,
        price: "1800",
        priceCurrency: "MXN",
        availability: "https://schema.org/InStock",
        validFrom: "2026-09-26T00:00:00-06:00",
        priceValidUntil: "2026-10-05T23:59:59-06:00",
      },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
