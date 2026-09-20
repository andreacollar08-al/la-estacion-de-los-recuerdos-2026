import type { MetadataRoute } from "next";
import { HERO_IMAGE, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: SITE_URL,
    lastModified: new Date("2026-09-19T00:00:00-06:00"),
    changeFrequency: "daily",
    priority: 1,
    images: [
      HERO_IMAGE,
      `${SITE_URL}/media/navidad-2026-galeria-01.jpg`,
      `${SITE_URL}/media/navidad-2026-galeria-03.jpg`,
      `${SITE_URL}/media/navidad-2026-galeria-09.jpg`,
    ],
  }];
}
