
export const LEAD_SOURCE_VALUES = ["direct", "facebook", "instagram", "whatsapp", "google", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCE_VALUES)[number];

export const leadSourceLabels: Record<LeadSource, string> = {
  direct: "Sitio web directo",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  google: "Google",
  other: "Otro sitio",
};

function sourceFromText(value: string): LeadSource | undefined {
  const normalized = value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return undefined;
  if (normalized.includes("facebook") || normalized === "fb" || normalized.includes("meta")) return "facebook";
  if (normalized.includes("instagram") || normalized === "ig") return "instagram";
  if (normalized.includes("whatsapp") || normalized === "wa") return "whatsapp";
  if (normalized.includes("google") || normalized === "gads" || normalized === "ads") return "google";
  if (normalized.includes("direct") || normalized === "web" || normalized === "sitio" || normalized === "website") return "direct";
  return undefined;
}

export function normalizeLeadSource(value: unknown): LeadSource {
  if (typeof value !== "string") return "direct";
  return sourceFromText(value) ?? (LEAD_SOURCE_VALUES.includes(value as LeadSource) ? value as LeadSource : "other");
}

export function inferLeadSource(search = "", referrer = ""): LeadSource {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  } catch {
    params = new URLSearchParams();
  }

  if (params.has("gclid") || params.has("gbraid") || params.has("wbraid")) return "google";
  if (params.has("fbclid")) return "facebook";
  if (params.has("igshid")) return "instagram";

  for (const key of ["utm_source", "source", "ref", "referrer"]) {
    const source = sourceFromText(params.get(key) ?? "");
    if (source) return source;
  }

  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("facebook") || host === "fb.me") return "facebook";
    if (host.includes("instagram") || host === "ig.me") return "instagram";
    if (host.includes("whatsapp") || host === "wa.me") return "whatsapp";
    if (host === "google.com" || host.endsWith(".google.com") || host.endsWith(".google.com.mx")) return "google";
    if (host === "rubielphoto.com" || host.endsWith(".rubielphoto.com")) return "direct";
  } catch {
    return "other";
  }
  return "other";
}
