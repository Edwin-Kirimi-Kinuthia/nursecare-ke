import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { LoginChallengeResult, PublicUser, RegisterInput } from "@carebora/shared";
import { ApiError, ErrorCode } from "@carebora/shared";
import { api, onSessionEnded } from "./api";
import { clearTokens, getRefreshToken, loadTokens, saveTokens } from "./tokens";
import * as SecureStore from "expo-secure-store";
import { unregisterThisDevice } from "./push";

/**
 * booting   — reading the keychain and checking the session
 * signedOut — no session (the app is still browsable)
 * signedIn  — `user` is set
 * offline   — there is a saved session but the server couldn't be reached to
 *             check it; keep it and let the person retry rather than sign them out
 */
export type AuthStatus = "booting" | "signedOut" | "signedIn" | "offline";

type AuthValue = {
  status: AuthStatus;
  user: PublicUser | null;
  /** Step 1: password. Emails a one-time code. */
  beginSignIn: (email: string, password: string) => Promise<LoginChallengeResult>;
  /** Step 2: the emailed code. Starts the session. */
  completeSignIn: (email: string, code: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch the user after a change (name, photo, verification). */
  refreshUser: () => Promise<void>;
  retry: () => Promise<void>;
  /** After the server deleted the account: drop everything local. */
  afterDeletion: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [user, setUser] = useState<PublicUser | null>(null);

  const boot = useCallback(async () => {
    await loadTokens();
    if (!getRefreshToken()) { setStatus("signedOut"); return; }
    try {
      // The client refreshes an expired access token by itself and replays this.
      setUser(await api.me());
      setStatus("signedIn");
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        await clearTokens();
        setUser(null);
        setStatus("signedOut");
      } else {
        setStatus("offline");
      }
    }
  }, []);

  // On a microtask so boot()'s state writes don't happen synchronously inside the effect.
  useEffect(() => { queueMicrotask(() => { void boot(); }); }, [boot]);

  // The API client tells us when a refresh token is rejected mid-session.
  useEffect(() => onSessionEnded(() => { setUser(null); setStatus("signedOut"); }), []);

  const beginSignIn = useCallback((email: string, password: string) => api.login({ email: email.trim().toLowerCase(), password }), []);

  const completeSignIn = useCallback(async (email: string, code: string) => {
    const res = await api.verifyLoginOtp({ email: email.trim().toLowerCase(), code });
    await saveTokens(res);
    setUser(res.user);
    setStatus("signedIn");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.register(input);
    await saveTokens(res);
    setUser(res.user);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    const rt = getRefreshToken();
    // Stop this phone receiving this person's notifications once they've left.
    // Must happen while still authenticated. Best effort throughout: if we're
    // offline the local session still has to end.
    await unregisterThisDevice();
    if (rt) await api.logout(rt).catch(() => {});
    await clearTokens();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const refreshUser = useCallback(async () => { setUser(await api.me()); }, []);

  const afterDeletion = useCallback(async () => {
    await clearTokens();
    await SecureStore.deleteItemAsync("carebora.pushToken").catch(() => {});
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, beginSignIn, completeSignIn, register, signOut, refreshUser, retry: boot, afterDeletion }),
    [status, user, beginSignIn, completeSignIn, register, signOut, refreshUser, boot, afterDeletion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
