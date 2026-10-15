import { CareBoraClient } from "@carebora/api-client";
import { ApiError, ErrorCode } from "@carebora/shared";
import { API_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "./tokens";

/** Screens subscribe to learn the session ended (refresh token rejected) without polling. */
const signedOutListeners = new Set<() => void>();
export const onSessionEnded = (fn: () => void) => {
  signedOutListeners.add(fn);
  return () => { signedOutListeners.delete(fn); };
};

/**
 * Called by the client when a request comes back 401 with an access token
 * (they last 15 minutes). Swap the refresh token for a new pair, store it, and
 * tell the client to replay the request. If the server rejects the refresh
 * token the session is genuinely over: wipe it and tell the UI. A *network*
 * failure is not that — the user is just offline — so tokens are kept.
 */
async function refreshSession(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    await saveTokens(await api.refresh(rt));
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
      await clearTokens();
      signedOutListeners.forEach((fn) => fn());
    }
    return false;
  }
}

export const api = new CareBoraClient({
  baseUrl: API_URL,
  credentials: "omit", // never use the OS cookie jar — see ClientOptions.credentials
  getToken: getAccessToken,
  onUnauthorized: refreshSession,
});
