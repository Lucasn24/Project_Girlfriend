import { useMemo, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { WeekTimeGrid } from "../components/calendar/WeekTimeGrid";
import { getLocation } from "../data/locations";
import { partnerName } from "../data/thread";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useSettings } from "../hooks/useSettings";
import type { CalendarEvent } from "../types";
import {
  addDays,
  addMonths,
  dayKey,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "../utils/calendarRange";
import styles from "./CalendarPage.module.css";

type CalendarViewMode = "week" | "month";

const MONTH_VISIBLE_EVENT_LIMIT = 3;

function formatRangeLabel(mode: CalendarViewMode, cursor: Date, timeZone: string): string {
  if (mode === "month") {
    return cursor.toLocaleDateString([], { month: "long", year: "numeric", timeZone });
  }
  const start = startOfWeek(cursor, timeZone);
  const end = addDays(start, 6, timeZone);
  const startLabel = start.toLocaleDateString([], { month: "short", day: "numeric", timeZone });
  const endLabel = end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone });
  return `${startLabel} – ${endLabel}`;
}

function daysBetween(rangeStart: Date, rangeEnd: Date, timeZone: string): Date[] {
  const total =
    Math.round((startOfDay(rangeEnd, timeZone).getTime() - startOfDay(rangeStart, timeZone).getTime()) / 86_400_000) +
    1;
  return Array.from({ length: total }, (_, i) => addDays(rangeStart, i, timeZone));
}

export function CalendarPage() {
  const [mode, setMode] = useState<CalendarViewMode>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const { userLocationId } = useSettings();
  const timeZone = getLocation(userLocationId).timeZone;

  const rangeStart =
    mode === "week" ? startOfWeek(cursor, timeZone) : startOfWeek(startOfMonth(cursor, timeZone), timeZone);
  const rangeEnd = mode === "week" ? endOfWeek(cursor, timeZone) : endOfWeek(endOfMonth(cursor, timeZone), timeZone);

  const { events, error } = useCalendarEvents(rangeStart, rangeEnd);

  const days = useMemo(() => daysBetween(rangeStart, rangeEnd, timeZone), [rangeStart, rangeEnd, timeZone]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of days) map.set(dayKey(day, timeZone), []);
    for (const event of events) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      for (const day of days) {
        if (isSameDay(eventStart, day, timeZone) || (eventStart < day && eventEnd > day)) {
          map.get(dayKey(day, timeZone))?.push(event);
        }
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [days, events, timeZone]);

  const goPrev = () =>
    setCursor((prev) => (mode === "week" ? addDays(prev, -7, timeZone) : addMonths(prev, -1, timeZone)));
  const goNext = () =>
    setCursor((prev) => (mode === "week" ? addDays(prev, 7, timeZone) : addMonths(prev, 1, timeZone)));
  const goToday = () => setCursor(new Date());

  const today = new Date();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>{formatRangeLabel(mode, cursor, timeZone)}</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segment} ${mode === "week" ? styles.segmentActive : ""}`}
              onClick={() => setMode("week")}
              aria-pressed={mode === "week"}
            >
              Week
            </button>
            <button
              type="button"
              className={`${styles.segment} ${mode === "month" ? styles.segmentActive : ""}`}
              onClick={() => setMode("month")}
              aria-pressed={mode === "month"}
            >
              Month
            </button>
          </div>

          <div className={styles.nav}>
            <button type="button" className={styles.navButton} onClick={goPrev} aria-label="Previous">
              <CaretLeftIcon size={16} weight="bold" />
            </button>
            <button type="button" className={styles.todayButton} onClick={goToday}>
              Today
            </button>
            <button type="button" className={styles.navButton} onClick={goNext} aria-label="Next">
              <CaretRightIcon size={16} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotUser}`} aria-hidden="true" />
          You
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotPartner}`} aria-hidden="true" />
          {partnerName}
        </span>
        {error && <span className={styles.error}>{error}</span>}
      </div>

      <main className={`${styles.main} no-scrollbar`}>
        {mode === "week" ? (
          <WeekTimeGrid
            key={rangeStart.toISOString()}
            days={days}
            eventsByDay={eventsByDay}
            today={today}
            timeZone={timeZone}
          />
        ) : (
          <div className={styles.monthGrid}>
            {days.map((day) => {
              const key = dayKey(day, timeZone);
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today, timeZone);
              const isCurrentMonth = isSameMonth(day, cursor, timeZone);

              return (
                <div
                  key={key}
                  className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ""} ${
                    !isCurrentMonth ? styles.dayCellMuted : ""
                  }`}
                >
                  <div className={styles.dayHeader}>
                    <span className={styles.dayNumber}>{day.toLocaleDateString([], { day: "numeric", timeZone })}</span>
                  </div>
                  <div className={styles.dayEvents}>
                    {dayEvents.slice(0, MONTH_VISIBLE_EVENT_LIMIT).map((event) => (
                      <div
                        key={event.id}
                        className={`${styles.eventPill} ${
                          event.owner === "user" ? styles.eventPillUser : styles.eventPillPartner
                        }`}
                        title={event.title}
                      >
                        <span className={styles.eventTitle}>{event.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > MONTH_VISIBLE_EVENT_LIMIT && (
                      <p className={styles.moreEvents}>+{dayEvents.length - MONTH_VISIBLE_EVENT_LIMIT} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
