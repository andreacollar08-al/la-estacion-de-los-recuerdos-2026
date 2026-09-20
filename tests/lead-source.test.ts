import { describe, expect, it } from "vitest";
import { inferLeadSource, normalizeLeadSource } from "../src/lib/lead-source";

describe("lead source attribution", () => {
  it("uses UTM sources before browser referrers", () => {
    expect(inferLeadSource("?utm_source=instagram", "https://www.google.com/" )).toBe("instagram");
    expect(inferLeadSource("?utm_source=whatsapp", "")).toBe("whatsapp");
  });

  it("recognizes common campaign click identifiers", () => {
    expect(inferLeadSource("?gclid=abc", "")).toBe("google");
    expect(inferLeadSource("?fbclid=abc", "")).toBe("facebook");
    expect(inferLeadSource("?igshid=abc", "")).toBe("instagram");
  });

  it("falls back to social referrers and direct traffic", () => {
    expect(inferLeadSource("", "https://l.facebook.com/l.php")).toBe("facebook");
    expect(inferLeadSource("", "https://l.instagram.com/" )).toBe("instagram");
    expect(inferLeadSource("", "https://web.whatsapp.com/" )).toBe("whatsapp");
    expect(inferLeadSource("", "https://la-estacion-de-los-recuerdos-2026.rubiel-photo.chatgpt.site/#reserva")).toBe("direct");
    expect(inferLeadSource("", "")).toBe("direct");
  });

  it("normalizes old or missing records safely", () => {
    expect(normalizeLeadSource(undefined)).toBe("direct");
    expect(normalizeLeadSource("fb")).toBe("facebook");
    expect(normalizeLeadSource("unknown-channel")).toBe("other");
  });
});
