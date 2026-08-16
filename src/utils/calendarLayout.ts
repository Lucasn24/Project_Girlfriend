import type { CalendarEvent } from "../types";

export interface LaidOutEvent {
  event: CalendarEvent;
  column: number;
  columns: number;
}

/**
 * Assigns side-by-side columns to events that overlap in time, the way
 * a day/week timetable renders concurrent meetings next to each other.
 */
export function layoutOverlappingEvents(events: CalendarEvent[]): LaidOutEvent[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  const clusters: CalendarEvent[][] = [];
  let current: CalendarEvent[] = [];
  let currentEnd = -Infinity;

  for (const event of sorted) {
    const start = new Date(event.start).getTime();
    if (current.length > 0 && start >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(event);
    currentEnd = Math.max(currentEnd, new Date(event.end).getTime());
  }
  if (current.length > 0) clusters.push(current);

  const result: LaidOutEvent[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const assignments: { event: CalendarEvent; column: number }[] = [];

    for (const event of cluster) {
      const start = new Date(event.start).getTime();
      const end = new Date(event.end).getTime();
      let column = columnEnds.findIndex((endTime) => endTime <= start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[column] = end;
      }
      assignments.push({ event, column });
    }

    const columns = columnEnds.length;
    for (const assignment of assignments) {
      result.push({ ...assignment, columns });
    }
  }

  return result;
}
