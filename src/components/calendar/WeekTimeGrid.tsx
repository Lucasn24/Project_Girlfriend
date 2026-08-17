import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "../../types";
import { layoutOverlappingEvents } from "../../utils/calendarLayout";
import {
  addDays,
  dayKey,
  getZonedParts,
  getZonedWeekday,
  minutesOfDay,
  startOfDay,
  zonedYmdToUtc,
} from "../../utils/calendarRange";
import styles from "./WeekTimeGrid.module.css";

const HOUR_HEIGHT_REM = 3.5;
const MIN_EVENT_HEIGHT_REM = 1.25;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTES_PER_DAY = 24 * 60;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
const MOVE_THRESHOLD_PX = 4;

type DragState =
  | { kind: "select"; dayIndex: number; anchorMinutes: number; currentMinutes: number }
  | {
      kind: "move";
      event: CalendarEvent;
      dayIndex: number;
      startMinutes: number;
      durationMinutes: number;
      grabOffsetMinutes: number;
      pointerStartX: number;
      pointerStartY: number;
      moved: boolean;
    }
  | {
      kind: "resize";
      event: CalendarEvent;
      dayIndex: number;
      startMinutes: number;
      endMinutes: number;
      pointerStartX: number;
      pointerStartY: number;
      moved: boolean;
    };

interface WeekTimeGridProps {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  today: Date;
  timeZone: string;
  onCreateRequest: (start: Date, end: Date, allDay: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventContextMenu: (event: CalendarEvent, x: number, y: number) => void;
  onSlotContextMenu: (start: Date, allDay: boolean, x: number, y: number) => void;
  onEventChange: (event: CalendarEvent, start: Date, end: Date) => void;
}

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function eventTimeLabel(event: CalendarEvent, timeZone: string): string {
  return new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

function minutesRangeLabel(startMinutes: number, endMinutes: number): string {
  const format = (minutes: number) => {
    const date = new Date();
    date.setHours(0, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  return `${format(startMinutes)} – ${format(endMinutes)}`;
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

function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
}

function minutesToDate(day: Date, minutes: number, timeZone: string): Date {
  const { year, month, day: dayOfMonth } = getZonedParts(day, timeZone);
  const clamped = Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
  const hour = Math.min(23, Math.floor(clamped / 60));
  const minute = Math.round(clamped % 60);
  return zonedYmdToUtc(year, month, dayOfMonth, hour, minute, 0, timeZone);
}

export function WeekTimeGrid({
  days,
  eventsByDay,
  today,
  timeZone,
  onCreateRequest,
  onEventClick,
  onEventContextMenu,
  onSlotContextMenu,
  onEventChange,
}: WeekTimeGridProps) {
  const daysRowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const getPoint = (clientX: number, clientY: number): { dayIndex: number; minutes: number } | null => {
    const rect = daysRowRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const columnWidth = rect.width / days.length;
    const dayIndex = Math.min(days.length - 1, Math.max(0, Math.floor((clientX - rect.left) / columnWidth)));
    const minutes = clampMinutes(((clientY - rect.top) / rect.height) * MINUTES_PER_DAY);
    return { dayIndex, minutes };
  };

  useEffect(() => {
    if (!isDragging) return;

    function handleMove(event: MouseEvent) {
      const current = dragRef.current;
      if (!current) return;
      const point = getPoint(event.clientX, event.clientY);
      if (!point) return;

      if (current.kind === "select") {
        applyDrag({ ...current, currentMinutes: point.minutes });
        return;
      }

      const dist = Math.hypot(event.clientX - current.pointerStartX, event.clientY - current.pointerStartY);
      const moved = current.moved || dist > MOVE_THRESHOLD_PX;

      if (current.kind === "move") {
        const rawStart = point.minutes - current.grabOffsetMinutes;
        const clampedStart = Math.min(
          Math.max(snap(rawStart), 0),
          MINUTES_PER_DAY - current.durationMinutes,
        );
        applyDrag({ ...current, dayIndex: point.dayIndex, startMinutes: clampedStart, moved });
      } else {
        const minEnd = current.startMinutes + MIN_DURATION_MINUTES;
        const clampedEnd = Math.min(Math.max(snap(point.minutes), minEnd), MINUTES_PER_DAY);
        applyDrag({ ...current, endMinutes: clampedEnd, moved });
      }
    }

    function handleUp() {
      const finished = dragRef.current;
      applyDrag(null);
      setIsDragging(false);
      if (!finished) return;

      if (finished.kind === "select") {
        const day = days[finished.dayIndex];
        const rawStart = Math.min(finished.anchorMinutes, finished.currentMinutes);
        const rawEnd = Math.max(finished.anchorMinutes, finished.currentMinutes);
        const snappedStart = snap(rawStart);
        const snappedEnd = rawEnd - rawStart >= MIN_DURATION_MINUTES ? snap(rawEnd) : snappedStart + 60;
        onCreateRequest(
          minutesToDate(day, snappedStart, timeZone),
          minutesToDate(day, Math.min(snappedEnd, MINUTES_PER_DAY), timeZone),
          false,
        );
      } else if (finished.kind === "move" && finished.moved) {
        const day = days[finished.dayIndex];
        const start = minutesToDate(day, finished.startMinutes, timeZone);
        const end = minutesToDate(day, finished.startMinutes + finished.durationMinutes, timeZone);
        onEventChange(finished.event, start, end);
      } else if (finished.kind === "resize" && finished.moved) {
        const day = days[finished.dayIndex];
        const start = minutesToDate(day, finished.startMinutes, timeZone);
        const end = minutesToDate(day, finished.endMinutes, timeZone);
        onEventChange(finished.event, start, end);
      }
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const startSelect = (dayIndex: number, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    const point = getPoint(event.clientX, event.clientY);
    if (!point) return;
    const anchor = snap(point.minutes);
    applyDrag({ kind: "select", dayIndex, anchorMinutes: anchor, currentMinutes: anchor });
    setIsDragging(true);
  };

  const startMove = (calEvent: CalendarEvent, dayIndex: number, day: Date, event: React.MouseEvent) => {
    if (calEvent.source === "ical" || event.button !== 0) return;
    event.stopPropagation();
    const point = getPoint(event.clientX, event.clientY);
    if (!point) return;
    const { startMinutes, endMinutes } = clipToDay(calEvent, day, timeZone);
    applyDrag({
      kind: "move",
      event: calEvent,
      dayIndex,
      startMinutes,
      durationMinutes: endMinutes - startMinutes,
      grabOffsetMinutes: point.minutes - startMinutes,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      moved: false,
    });
    setIsDragging(true);
  };

  const startResize = (calEvent: CalendarEvent, dayIndex: number, day: Date, event: React.MouseEvent) => {
    if (calEvent.source === "ical" || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const { startMinutes, endMinutes } = clipToDay(calEvent, day, timeZone);
    applyDrag({
      kind: "resize",
      event: calEvent,
      dayIndex,
      startMinutes,
      endMinutes,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      moved: false,
    });
    setIsDragging(true);
  };

  const handleColumnContextMenu = (day: Date, event: React.MouseEvent) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = clampMinutes(((event.clientY - rect.top) / rect.height) * MINUTES_PER_DAY);
    onSlotContextMenu(minutesToDate(day, snap(minutes), timeZone), false, event.clientX, event.clientY);
  };

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
                <div
                  key={key}
                  className={styles.allDayCell}
                  onClick={() => onCreateRequest(day, addDays(day, 1, timeZone), true)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onSlotContextMenu(day, true, event.clientX, event.clientY);
                  }}
                >
                  {(allDayByDay.get(key) ?? []).map((event) => (
                    <div
                      key={event.id}
                      className={`${styles.allDayPill} ${
                        event.owner === "user" ? styles.eventUser : styles.eventPartner
                      }`}
                      title={event.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventContextMenu(event, e.clientX, e.clientY);
                      }}
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

        <div className={styles.daysRow} ref={daysRowRef}>
          {days.map((day, dayIndex) => {
            const key = dayKey(day, timeZone);
            const isToday = key === todayKey;
            const draggingThisEvent =
              drag && (drag.kind === "move" || drag.kind === "resize") ? drag.event : null;
            const columnEvents = (timedByDay.get(key) ?? []).filter((event) => event.id !== draggingThisEvent?.id);
            const laidOut = layoutOverlappingEvents(columnEvents);

            const selectionPreview =
              drag && drag.kind === "select" && drag.dayIndex === dayIndex
                ? {
                    top: (Math.min(drag.anchorMinutes, drag.currentMinutes) / 60) * HOUR_HEIGHT_REM,
                    height:
                      (Math.max(
                        Math.abs(drag.currentMinutes - drag.anchorMinutes),
                        SNAP_MINUTES,
                      ) /
                        60) *
                      HOUR_HEIGHT_REM,
                    label: minutesRangeLabel(
                      Math.min(drag.anchorMinutes, drag.currentMinutes),
                      Math.max(drag.anchorMinutes, drag.currentMinutes),
                    ),
                  }
                : null;

            const movePreview =
              drag && drag.kind === "move" && drag.dayIndex === dayIndex
                ? {
                    startMinutes: drag.startMinutes,
                    endMinutes: drag.startMinutes + drag.durationMinutes,
                  }
                : null;

            const resizePreview =
              drag && drag.kind === "resize" && drag.dayIndex === dayIndex
                ? { startMinutes: drag.startMinutes, endMinutes: drag.endMinutes }
                : null;

            return (
              <div
                key={key}
                className={`${styles.dayColumn} ${isToday ? styles.dayColumnToday : ""}`}
                style={{
                  height: `${24 * HOUR_HEIGHT_REM}rem`,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_HEIGHT_REM}rem)`,
                }}
                onMouseDown={(event) => startSelect(dayIndex, event)}
                onContextMenu={(event) => handleColumnContextMenu(day, event)}
              >
                {isToday && (
                  <div className={styles.nowLine} style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT_REM}rem` }} />
                )}

                {selectionPreview && (
                  <div
                    className={styles.selectionPreview}
                    style={{ top: `${selectionPreview.top}rem`, height: `${selectionPreview.height}rem` }}
                  >
                    <span className={styles.selectionPreviewLabel}>{selectionPreview.label}</span>
                  </div>
                )}

                {laidOut.map(({ event, column, columns }) => {
                  const { startMinutes, endMinutes } = clipToDay(event, day, timeZone);
                  const top = (startMinutes / 60) * HOUR_HEIGHT_REM;
                  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_REM, MIN_EVENT_HEIGHT_REM);
                  const widthPct = 100 / columns;
                  const leftPct = widthPct * column;
                  const isEditable = event.source !== "ical";

                  return (
                    <div
                      key={event.id}
                      className={`${styles.timedEvent} ${
                        event.owner === "user" ? styles.eventUser : styles.eventPartner
                      } ${isEditable ? styles.timedEventLocal : ""}`}
                      style={{
                        top: `${top}rem`,
                        height: `${height}rem`,
                        width: `calc(${widthPct}% - 4px)`,
                        left: `calc(${leftPct}% + 2px)`,
                      }}
                      title={event.title}
                      onMouseDown={(e) => startMove(event, dayIndex, day, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEventContextMenu(event, e.clientX, e.clientY);
                      }}
                    >
                      <span className={styles.timedEventTime}>{eventTimeLabel(event, timeZone)}</span>
                      <span className={styles.timedEventTitle}>{event.title}</span>
                      {isEditable && (
                        <div
                          className={styles.resizeHandle}
                          onMouseDown={(e) => startResize(event, dayIndex, day, e)}
                        />
                      )}
                    </div>
                  );
                })}

                {movePreview &&
                  draggingThisEvent &&
                  (() => {
                    const top = (movePreview.startMinutes / 60) * HOUR_HEIGHT_REM;
                    const height = Math.max(
                      ((movePreview.endMinutes - movePreview.startMinutes) / 60) * HOUR_HEIGHT_REM,
                      MIN_EVENT_HEIGHT_REM,
                    );
                    return (
                      <div
                        className={`${styles.timedEvent} ${styles.timedEventDragging} ${
                          draggingThisEvent.owner === "user" ? styles.eventUser : styles.eventPartner
                        }`}
                        style={{ top: `${top}rem`, height: `${height}rem`, width: "calc(100% - 4px)", left: "2px" }}
                      >
                        <span className={styles.timedEventTime}>
                          {minutesRangeLabel(movePreview.startMinutes, movePreview.endMinutes)}
                        </span>
                        <span className={styles.timedEventTitle}>{draggingThisEvent.title}</span>
                      </div>
                    );
                  })()}

                {resizePreview &&
                  draggingThisEvent &&
                  (() => {
                    const top = (resizePreview.startMinutes / 60) * HOUR_HEIGHT_REM;
                    const height = Math.max(
                      ((resizePreview.endMinutes - resizePreview.startMinutes) / 60) * HOUR_HEIGHT_REM,
                      MIN_EVENT_HEIGHT_REM,
                    );
                    return (
                      <div
                        className={`${styles.timedEvent} ${styles.timedEventDragging} ${
                          draggingThisEvent.owner === "user" ? styles.eventUser : styles.eventPartner
                        }`}
                        style={{ top: `${top}rem`, height: `${height}rem`, width: "calc(100% - 4px)", left: "2px" }}
                      >
                        <span className={styles.timedEventTime}>
                          {minutesRangeLabel(resizePreview.startMinutes, resizePreview.endMinutes)}
                        </span>
                        <span className={styles.timedEventTitle}>{draggingThisEvent.title}</span>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
