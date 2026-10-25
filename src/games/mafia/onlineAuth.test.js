import { describe, expect, it } from "vitest";
import { isAnonymousSignInDisabled } from "./onlineAuth.js";

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
});
