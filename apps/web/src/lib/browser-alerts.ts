"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

let audio: AudioContext | null = null;
const key = (userId: string) => `carebora.browserAlerts.${userId}`;
type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };
function serialize(subscription: PushSubscription): Subscription {
  return JSON.parse(JSON.stringify(subscription));
}

function chime() {
  if (audio?.state !== "running") return false;
  const now = audio.currentTime;
  for (const [index, frequency] of [660, 880].entries()) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * 0.16);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.16 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.16 + 0.15);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(now + index * 0.16); oscillator.stop(now + index * 0.16 + 0.16);
  }
  return true;
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

async function bind(userId: string) {
  const { publicKey } = await api.browserPushConfig();
  if (!publicKey) throw new Error("Device alerts are not available yet. Please try again later.");
  const reg = await registration();
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const subscription = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await api.registerBrowserPush(userId, serialize(subscription));
  return reg;
}

export async function unregisterBrowserAlerts(userId: string) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      try { await api.unregisterBrowserPush(userId, serialize(sub)); }
      finally { await sub.unsubscribe(); }
    }
    for (const notification of await reg?.getNotifications() ?? []) notification.close();
  } catch { /* Sign-out must still succeed when a device is offline. */ }
}

export function useBrowserAlerts(userId?: string) {
  const [supported, setSupported] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const isDesktop = navigator.userAgent.includes("Electron/");
    const canPush = !isDesktop && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    queueMicrotask(() => { if (live) { setDesktop(isDesktop); setSupported(canPush); setEnabled(false); setError(""); } });
    if (canPush && userId && Notification.permission === "granted" && localStorage.getItem(key(userId)) === "true") {
      void bind(userId).then(() => { if (live) setEnabled(true); }).catch(() => { if (live) setError("Device alerts could not connect. Try enabling them again."); });
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "CAREBORA_ALERT") return;
      const allowed = event.data.userId === userId && userId && localStorage.getItem(key(userId)) === "true";
      event.ports[0]?.postMessage(Boolean(allowed && chime()));
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => { live = false; navigator.serviceWorker?.removeEventListener("message", onMessage); };
  }, [userId]);

  async function enable() {
    if (!userId || !supported) return;
    setPending(true); setError("");
    try {
      audio ??= new AudioContext();
      void audio.resume();
      if (await Notification.requestPermission() !== "granted") throw new Error("Allow Care Bora notifications in your browser settings to receive device alerts.");
      await bind(userId);
      localStorage.setItem(key(userId), "true");
      setEnabled(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not enable notifications."); }
    finally { setPending(false); }
  }

  async function test() {
    setError("");
    try {
      audio ??= new AudioContext();
      await audio.resume();
      const played = chime();
      const reg = await registration();
      await reg.showNotification("Care Bora notification test", { body: "Sound and device alerts are enabled.", icon: "/icon.png", tag: "carebora-test", silent: played });
    } catch { setError("Check notification and sound permissions in your browser and device settings."); }
  }

  async function disable() {
    if (!userId) return;
    localStorage.removeItem(key(userId)); setEnabled(false);
    await unregisterBrowserAlerts(userId);
  }
  return { supported, desktop, enabled, pending, error, enable, disable, test };
}
