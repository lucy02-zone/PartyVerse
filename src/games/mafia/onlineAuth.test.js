import { describe, expect, it } from "vitest";
import { createFriendlyAuthError, isAnonymousSignInDisabled, isOnlineAuthUnavailable } from "./onlineAuth.js";

describe("anonymous sign-in setup errors", () => {
  it("recognizes Supabase's disabled-provider code", () => {
    expect(isAnonymousSignInDisabled({ code: "anonymous_provider_disabled" })).toBe(true);
  });

  it("recognizes the HTTP 422 response and readable error message", () => {
    expect(isAnonymousSignInDisabled({ status: 422 })).toBe(true);
    expect(isAnonymousSignInDisabled(new Error("Anonymous sign-ins are disabled"))).toBe(true);
  });

  it("does not mislabel unrelated authentication errors", () => {
    expect(isAnonymousSignInDisabled({ code: "invalid_credentials", status: 400 })).toBe(false);
  });

  it("shows a safe, nontechnical message for disabled and other authentication failures", () => {
    const disabled = createFriendlyAuthError({ code: "anonymous_provider_disabled", status: 422 });
    const network = createFriendlyAuthError(new Error("FetchError with private diagnostics"));
    expect(disabled.message).toBe("Online Mafia is temporarily unavailable. Please try again shortly.");
    expect(disabled.code).toBe("anonymous_provider_disabled");
    expect(network.message).toBe(disabled.message);
    expect(network.message).not.toContain("private diagnostics");
    expect(isOnlineAuthUnavailable(disabled)).toBe(true);
    expect(isOnlineAuthUnavailable(network)).toBe(true);
    expect(isOnlineAuthUnavailable(new Error("Invalid room code."))).toBe(false);
  });
});
