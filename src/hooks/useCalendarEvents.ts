import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "../types";

const DEFAULT_POLL_MS = 2 * 60 * 1000;

export function useCalendarEvents(start: Date, end: Date, pollMs = DEFAULT_POLL_MS) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const refetch = useCallback(async () => {
    try {
      const params = new URLSearchParams({ start: startIso, end: endIso });
      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load calendar events");
      const data = await response.json();
      setEvents(data.events ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
    const id = setInterval(refetch, pollMs);
    return () => clearInterval(id);
  }, [refetch, pollMs]);

  return { events, isLoading, error, refetch };
}
