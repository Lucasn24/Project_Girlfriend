import { useCallback, useSyncExternalStore } from "react";

export type DashboardCardId = "conversation" | "connection" | "agenda" | "couplePhoto";

const STORAGE_KEY = "tether:dashboard-layout";
const DEFAULT_ORDER: DashboardCardId[] = ["conversation", "connection", "agenda", "couplePhoto"];

function isCardId(value: unknown): value is DashboardCardId {
  return typeof value === "string" && (DEFAULT_ORDER as string[]).includes(value);
}

function loadOrder(): DashboardCardId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const known = parsed.filter(isCardId);
        const missing = DEFAULT_ORDER.filter((id) => !known.includes(id));
        return [...known, ...missing];
      }
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_ORDER;
}

let state = loadOrder();
const listeners = new Set<() => void>();

function setState(next: DashboardCardId[]) {
  state = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useDashboardLayout() {
  const order = useSyncExternalStore(subscribe, getSnapshot);

  const moveCard = useCallback((activeId: DashboardCardId, overId: DashboardCardId) => {
    if (activeId === overId) return;
    const current = getSnapshot();
    const from = current.indexOf(activeId);
    const to = current.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, activeId);
    setState(next);
  }, []);

  return { order, moveCard };
}
