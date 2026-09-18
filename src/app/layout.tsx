import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "La Estación de los Recuerdos | Rubiel Photo Art",
  description:
    "Reserva tu mini sesión navideña 2026 en Palenque, Chiapas. Una experiencia victoriana para guardar la Navidad en familia.",
  metadataBase: new URL("https://rubielphoto.com"),
  openGraph: {
    title: "La Estación de los Recuerdos · Navidad 2026",
    description: "Una estación, una familia, recuerdos para siempre.",
    type: "website",
    images: [{ url: "/media/navidad-2026-maquinistas.jpg", width: 1280, height: 837, alt: "La Estación de los Recuerdos · Rubiel Photo Art" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
