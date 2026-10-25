import { describe, expect, it, vi } from "vitest";
import { createSupabaseClient, validateSupabaseConfig } from "./supabaseConfig.js";

const validConfig = {
  url: "https://partyverse-test.supabase.co",
  publishableKey: "sb_publishable_123456789012345678901234567890",
};

describe("Supabase browser configuration", () => {
  it.each([
    [{}, "missing-url"],
    [{ url: validConfig.url }, "missing-key"],
    [{ url: "not a url", publishableKey: validConfig.publishableKey }, "invalid-url"],
    [{ url: "http://partyverse.example", publishableKey: validConfig.publishableKey }, "invalid-url"],
    [{ url: validConfig.url, publishableKey: "sb_secret_never-for-the-browser" }, "invalid-key"],
    [{ url: validConfig.url, publishableKey: "bad-key" }, "invalid-key"],
  ])("rejects missing or unsafe config (%s)", (config, reason) => {
    expect(validateSupabaseConfig(config)).toEqual({ configured: false, reason });
  });

  it("accepts valid hosted and local URLs with publishable or legacy anon keys", () => {
    const legacyAnonKey = `header.${btoa(JSON.stringify({ role: "anon" }))}.signature`;
    expect(validateSupabaseConfig(validConfig)).toMatchObject({ configured: true, reason: null });
    expect(validateSupabaseConfig({ url: "http://localhost:54321", publishableKey: legacyAnonKey }).configured).toBe(true);
  });

  it("does not initialize a client for missing or malformed values", () => {
    const clientFactory = vi.fn();
    expect(createSupabaseClient({ url: "", publishableKey: "" }, clientFactory)).toBeNull();
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("initializes a configured client with persistent session options", () => {
    const client = { auth: {} };
    const clientFactory = vi.fn(() => client);
    expect(createSupabaseClient(validConfig, clientFactory)).toBe(client);
    expect(clientFactory).toHaveBeenCalledWith(validConfig.url, validConfig.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
  });
});
