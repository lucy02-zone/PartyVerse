export function isAnonymousSignInDisabled(error) {
  return error?.code === "anonymous_provider_disabled"
    || error?.status === 422
    || /anonymous sign.?ins? (are )?disabled/i.test(error?.message ?? "");
}
