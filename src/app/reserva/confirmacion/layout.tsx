import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmación de reserva",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ConfirmationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
