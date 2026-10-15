import * as SecureStore from "expo-secure-store";

/**
 * The session lives in the OS keychain (iOS) / Keystore-backed storage
 * (Android), never in plain AsyncStorage: a refresh token is as good as a
 * password for thirty days. Both tokens are well under SecureStore's size
 * limits (the access token is ~210 characters, the refresh token 64).
 *
 * A copy is also kept in memory, because the API client asks for the access
 * token on every request and reading the keychain each time would be slow.
 */
const ACCESS_KEY = "carebora.access";
const REFRESH_KEY = "carebora.refresh";

let access: string | null = null;
let refresh: string | null = null;

export type TokenPair = { accessToken: string; refreshToken: string };

export async function loadTokens() {
  [access, refresh] = await Promise.all([SecureStore.getItemAsync(ACCESS_KEY), SecureStore.getItemAsync(REFRESH_KEY)]);
}

export const getAccessToken = () => access;
export const getRefreshToken = () => refresh;
export const hasSession = () => refresh !== null;

export async function saveTokens(pair: TokenPair) {
  access = pair.accessToken;
  refresh = pair.refreshToken;
  await Promise.all([SecureStore.setItemAsync(ACCESS_KEY, access), SecureStore.setItemAsync(REFRESH_KEY, refresh)]);
}

export async function clearTokens() {
  access = null;
  refresh = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
}
