import { describe, expect, it } from "vitest";
import {
  createMafiaCorsPolicy,
  createMafiaJsonResponse,
  createMafiaPreflightResponse,
  DEFAULT_MAFIA_ORIGINS,
  getAllowedMafiaOrigins,
} from "./cors.js";

describe("Online Mafia Edge Function CORS", () => {
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://partyverse-gules.vercel.app",
  ])("allows the configured PartyVerse origin %s", (origin) => {
    const policy = createMafiaCorsPolicy(origin);
    expect(policy.allowed).toBe(true);
    expect(policy.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(policy.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("returns a successful preflight with the headers sent by supabase-js", async () => {
    const response = createMafiaPreflightResponse("http://localhost:5173");
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("apikey");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("content-type");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-client-info");
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it.each([200, 400, 500])("keeps matching CORS headers on HTTP %i responses", async (status) => {
    const policy = createMafiaCorsPolicy("https://partyverse-gules.vercel.app");
    const response = createMafiaJsonResponse({ ok: status < 400 }, status, policy);
    expect(response.status).toBe(status);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://partyverse-gules.vercel.app");
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ ok: status < 400 });
  });

  it("rejects unlisted origins without reflecting them", () => {
    const response = createMafiaPreflightResponse("https://attacker.example");
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(createMafiaCorsPolicy("https://attacker.example").allowed).toBe(false);
  });

  it("accepts valid exact origins from the optional allowlist and ignores paths", () => {
    const allowed = getAllowedMafiaOrigins("https://partyverse.example,http://localhost:5174/path");
    expect(allowed.has("https://partyverse.example")).toBe(true);
    expect(allowed.has("http://localhost:5174/path")).toBe(false);
    expect(allowed.has("https://evil.example")).toBe(false);
    expect(DEFAULT_MAFIA_ORIGINS).toContain("https://partyverse-gules.vercel.app");
  });
});
