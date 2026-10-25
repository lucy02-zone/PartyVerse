export const DEFAULT_MAFIA_ORIGINS = Object.freeze([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://partyverse-gules.vercel.app",
]);

function isValidOrigin(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:")
      && !url.username
      && !url.password
      && url.origin === value;
  } catch {
    return false;
  }
}

export function getAllowedMafiaOrigins(extraOrigins = "") {
  const configured = typeof extraOrigins === "string"
    ? extraOrigins.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];
  return new Set([...DEFAULT_MAFIA_ORIGINS, ...configured.filter(isValidOrigin)]);
}

export function createMafiaCorsPolicy(origin, allowedOrigins = getAllowedMafiaOrigins()) {
  const allowed = origin === null || allowedOrigins.has(origin);
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });

  if (origin !== null && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return { allowed, headers };
}

export function createMafiaPreflightResponse(origin, allowedOrigins = getAllowedMafiaOrigins()) {
  const policy = createMafiaCorsPolicy(origin, allowedOrigins);
  return new Response(null, { status: policy.allowed ? 204 : 403, headers: policy.headers });
}

export function createMafiaJsonResponse(body, status, policy) {
  const headers = new Headers(policy.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}
