// Keep every canonical URL on the production domain. `NEXT_PUBLIC_SITE_URL` is
// evaluated by Next.js at build time and can be overridden by the VPS without
// changing the application code.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rubielphoto.com").replace(/\/$/, "");
export const SITE_NAME = "La Estación de los Recuerdos | Rubiel Photo Art";
export const HERO_IMAGE = `${SITE_URL}/media/navidad-2026-maquinistas.jpg`;

