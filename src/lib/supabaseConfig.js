import { createClient } from "@supabase/supabase-js";

const publishableKeyPattern = /^sb_publishable_[A-Za-z0-9_-]{20,}$/;

function isLegacyAnonymousKey(value) {
  const parts = value.split(".");
  if (parts.length !== 3 || typeof globalThis.atob !== "function") return false;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = globalThis.atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return JSON.parse(decoded)?.role === "anon";
  } catch {
    return false;
  }
}

function isValidSupabaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return (url.protocol === "https:" || (url.protocol === "http:" && localHost))
      && Boolean(url.hostname)
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function isValidPublishableKey(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const key = value.trim();
  return publishableKeyPattern.test(key) || isLegacyAnonymousKey(key);
}

export function validateSupabaseConfig({ url, publishableKey } = {}) {
  if (typeof url !== "string" || !url.trim()) return { configured: false, reason: "missing-url" };
  if (typeof publishableKey !== "string" || !publishableKey.trim()) return { configured: false, reason: "missing-key" };
  if (!isValidSupabaseUrl(url)) return { configured: false, reason: "invalid-url" };
  if (!isValidPublishableKey(publishableKey)) return { configured: false, reason: "invalid-key" };
  return { configured: true, reason: null };
}

export function createSupabaseClient(config, clientFactory = createClient) {
  if (!validateSupabaseConfig(config).configured) return null;

  try {
    return clientFactory(config.url.trim(), config.publishableKey.trim(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}
