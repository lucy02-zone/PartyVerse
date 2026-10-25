export function isAnonymousSignInDisabled(error) {
  return error?.code === "anonymous_provider_disabled"
    || error?.status === 422
    || /anonymous sign.?ins? (are )?disabled/i.test(error?.message ?? "");
}

export function createFriendlyAuthError(error) {
  const friendlyError = new Error("Online Mafia is temporarily unavailable. Please try again shortly.");
  friendlyError.code = isAnonymousSignInDisabled(error)
    ? "anonymous_provider_disabled"
    : "online_auth_unavailable";
  return friendlyError;
}

export function isOnlineAuthUnavailable(error) {
  return error?.code === "anonymous_provider_disabled" || error?.code === "online_auth_unavailable";
}
