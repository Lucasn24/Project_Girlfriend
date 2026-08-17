import { useCallback, useEffect, useState } from "react";
import type { CalendarOwner } from "../types";

interface GoogleCalendarStatus {
  configured: boolean;
  user: { connected: boolean };
  partner: { connected: boolean };
}

const EMPTY_STATUS: GoogleCalendarStatus = {
  configured: false,
  user: { connected: false },
  partner: { connected: false },
};

export function useGoogleCalendarSync() {
  const [status, setStatus] = useState<GoogleCalendarStatus>(EMPTY_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingOwner, setConnectingOwner] = useState<CalendarOwner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/google/status");
      if (!response.ok) throw new Error("Failed to load Google Calendar status");
      setStatus(await response.json());
    } catch {
      // keep last known status on a transient failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(
    async (owner: CalendarOwner) => {
      setError(null);
      setConnectingOwner(owner);
      try {
        const response = await fetch(`/api/calendar/google/auth-url?owner=${owner}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to start Google Calendar connection");

        const popup = window.open(data.url, "google-calendar-auth", "width=520,height=650");
        if (!popup) throw new Error("Popup was blocked — allow popups for this site and try again");

        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (popup.closed) {
              clearInterval(interval);
              resolve();
            }
          }, 500);
        });

        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect Google Calendar");
      } finally {
        setConnectingOwner(null);
      }
    },
    [refresh],
  );

  const disconnect = useCallback(
    async (owner: CalendarOwner) => {
      setError(null);
      try {
        const response = await fetch(`/api/calendar/google/disconnect/${owner}`, { method: "POST" });
        if (!response.ok) throw new Error("Failed to disconnect Google Calendar");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to disconnect Google Calendar");
      }
    },
    [refresh],
  );

  return { status, isLoading, connectingOwner, error, connect, disconnect, refresh };
}
