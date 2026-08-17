import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_PARTNER_LOCATION_ID,
  DEFAULT_USER_LOCATION_ID,
} from "../../data/locations";

export type Theme = "light" | "dark";

interface Settings {
  userLocationId: string;
  partnerLocationId: string;
  theme: Theme;
}

const STORAGE_KEY = "tether:settings";

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function defaults(): Settings {
  return {
    userLocationId: DEFAULT_USER_LOCATION_ID,
    partnerLocationId: DEFAULT_PARTNER_LOCATION_ID,
    theme: prefersDark() ? "dark" : "light",
  };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return defaults();
}

let state = loadSettings();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
applyTheme(state.theme);

function setState(next: Partial<Settings>) {
  state = { ...state, ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (next.theme) applyTheme(next.theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const setUserLocationId = useCallback((id: string) => setState({ userLocationId: id }), []);
  const setPartnerLocationId = useCallback((id: string) => setState({ partnerLocationId: id }), []);
  const setTheme = useCallback((theme: Theme) => setState({ theme }), []);

  return { ...snapshot, setUserLocationId, setPartnerLocationId, setTheme };
}
