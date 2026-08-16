import { useCallback, useEffect, useState } from "react";
import type { CalendarOwner, CalendarStatus } from "../types";

type StatusMap = Record<CalendarOwner, CalendarStatus>;

const EMPTY_STATUS: CalendarStatus = { configured: false, lastSyncedAt: null, error: null };

const EMPTY_STATUS_MAP: StatusMap = { user: EMPTY_STATUS, partner: EMPTY_STATUS };

export function useCalendarSync() {
  const [status, setStatus] = useState<StatusMap>(EMPTY_STATUS_MAP);
  const [isLoading, setIsLoading] = useState(true);
  const [savingOwner, setSavingOwner] = useState<CalendarOwner | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/status");
      if (!response.ok) throw new Error("Failed to load calendar status");
      const data = await response.json();
      setStatus(data);
    } catch {
      // keep last known status on a transient failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setCalendarUrl = useCallback(async (owner: CalendarOwner, url: string) => {
    setSavingOwner(owner);
    setSaveError(null);
    try {
      const response = await fetch(`/api/calendar/config/${owner}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() ? url.trim() : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save calendar");
      setStatus((prev) => ({ ...prev, [owner]: data }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save calendar");
    } finally {
      setSavingOwner(null);
    }
  }, []);

  return { status, isLoading, savingOwner, saveError, setCalendarUrl, refresh };
}
