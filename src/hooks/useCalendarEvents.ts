import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent, CalendarOwner } from "../types";

const DEFAULT_POLL_MS = 2 * 60 * 1000;

export interface CalendarEventInput {
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  /** IANA time zone. Required when the target owner's events are Google-synced. */
  timeZone?: string;
}

export type CalendarEventPatch = Partial<CalendarEventInput>;

export function useCalendarEvents(start: Date, end: Date, pollMs = DEFAULT_POLL_MS) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

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

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      setMutationError(null);
      try {
        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to create event");
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to create event");
        return false;
      }
    },
    [refetch],
  );

  const updateEvent = useCallback(
    async (id: string, patch: CalendarEventPatch) => {
      setMutationError(null);
      try {
        const response = await fetch(`/api/calendar/events/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to update event");
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to update event");
        return false;
      }
    },
    [refetch],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      setMutationError(null);
      try {
        const response = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) throw new Error("Failed to delete event");
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to delete event");
        return false;
      }
    },
    [refetch],
  );

  return { events, isLoading, error, mutationError, refetch, createEvent, updateEvent, deleteEvent };
}
