import type { CalendarEvent } from "../../types";
import { layoutOverlappingEvents } from "../../utils/calendarLayout";
import { dayKey, getZonedParts, getZonedWeekday, minutesOfDay, startOfDay } from "../../utils/calendarRange";
import styles from "./WeekTimeGrid.module.css";

const HOUR_HEIGHT_REM = 3.5;
const MIN_EVENT_HEIGHT_REM = 1.25;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeekTimeGridProps {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: Date;
  timeZone: string;
}

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function eventTimeLabel(event: CalendarEvent, timeZone: string): string {
  return new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

function clipToDay(
  event: CalendarEvent,
  day: Date,
  timeZone: string,
): { startMinutes: number; endMinutes: number } {
  const dayStartMs = startOfDay(day, timeZone).getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60_000;
  const clippedStart = Math.max(new Date(event.start).getTime(), dayStartMs);
  const clippedEnd = Math.min(new Date(event.end).getTime(), dayEndMs);
  const startMinutes = (clippedStart - dayStartMs) / 60_000;
  const endMinutes = Math.max((clippedEnd - dayStartMs) / 60_000, startMinutes);
  return { startMinutes, endMinutes };
}

export function WeekTimeGrid({ days, eventsByDay, today, timeZone }: WeekTimeGridProps) {
  const allDayByDay = new Map<string, CalendarEvent[]>();
  const timedByDay = new Map<string, CalendarEvent[]>();
  let hasAllDayEvents = false;

  for (const day of days) {
    const key = dayKey(day, timeZone);
    const dayEvents = eventsByDay.get(key) ?? [];
    const allDay = dayEvents.filter((event) => event.allDay);
    const timed = dayEvents.filter((event) => !event.allDay);
    allDayByDay.set(key, allDay);
    timedByDay.set(key, timed);
    if (allDay.length > 0) hasAllDayEvents = true;
  }

  const nowMinutes = minutesOfDay(new Date(), timeZone);
  const todayKey = dayKey(today, timeZone);

  return (
    <div className={styles.grid}>
      <div className={styles.stickyTop}>
        <div className={styles.headerRow}>
          <div className={styles.gutter} />
          {days.map((day) => {
            const key = dayKey(day, timeZone);
            const isToday = key === todayKey;
            return (
              <div key={key} className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ""}`}>
                <span className={styles.dayHeaderName}>{WEEKDAY_LABELS[getZonedWeekday(day, timeZone)]}</span>
                <span className={styles.dayHeaderNumber}>{getZonedParts(day, timeZone).day}</span>
              </div>
            );
          })}
        </div>

        {hasAllDayEvents && (
          <div className={styles.allDayRow}>
            <div className={styles.gutter} />
            {days.map((day) => {
              const key = dayKey(day, timeZone);
              return (
                <div key={key} className={styles.allDayCell}>
                  {(allDayByDay.get(key) ?? []).map((event) => (
                    <div
                      key={event.id}
                      className={`${styles.allDayPill} ${
                        event.owner === "user" ? styles.eventUser : styles.eventPartner
                      }`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.hourGrid}>
        <div className={styles.hourLabels}>
          {HOURS.map((hour) => (
            <div key={hour} className={styles.hourLabelCell} style={{ height: `${HOUR_HEIGHT_REM}rem` }}>
              {hour > 0 && <span className={styles.hourLabelText}>{formatHourLabel(hour)}</span>}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = dayKey(day, timeZone);
          const isToday = key === todayKey;
          const laidOut = layoutOverlappingEvents(timedByDay.get(key) ?? []);

          return (
            <div
              key={key}
              className={`${styles.dayColumn} ${isToday ? styles.dayColumnToday : ""}`}
              style={{
                height: `${24 * HOUR_HEIGHT_REM}rem`,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_HEIGHT_REM}rem)`,
              }}
            >
              {isToday && (
                <div className={styles.nowLine} style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT_REM}rem` }} />
              )}

              {laidOut.map(({ event, column, columns }) => {
                const { startMinutes, endMinutes } = clipToDay(event, day, timeZone);
                const top = (startMinutes / 60) * HOUR_HEIGHT_REM;
                const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_REM, MIN_EVENT_HEIGHT_REM);
                const widthPct = 100 / columns;
                const leftPct = widthPct * column;

                return (
                  <div
                    key={event.id}
                    className={`${styles.timedEvent} ${
                      event.owner === "user" ? styles.eventUser : styles.eventPartner
                    }`}
                    style={{
                      top: `${top}rem`,
                      height: `${height}rem`,
                      width: `calc(${widthPct}% - 4px)`,
                      left: `calc(${leftPct}% + 2px)`,
                    }}
                    title={event.title}
                  >
                    <span className={styles.timedEventTime}>{eventTimeLabel(event, timeZone)}</span>
                    <span className={styles.timedEventTitle}>{event.title}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
