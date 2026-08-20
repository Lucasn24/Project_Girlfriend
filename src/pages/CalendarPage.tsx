import { useMemo, useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { ContextMenu, type ContextMenuItem } from "../components/calendar/ContextMenu";
import { EventModal, type EventModalSaveData } from "../components/calendar/EventModal";
import { WeekTimeGrid } from "../components/calendar/WeekTimeGrid";
import { getLocation } from "../data/locations";
import { partnerName } from "../data/thread";
import { useCalendarEvents } from "../hooks/calendar/useCalendarEvents";
import { useSettings } from "../hooks/settings/useSettings";
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

type ModalState = { mode: "create"; start: Date; end: Date; allDay: boolean } | { mode: "edit"; event: CalendarEvent };

type ContextMenuState = { x: number; y: number; items: ContextMenuItem[] };

const MONTH_VISIBLE_EVENT_LIMIT = 3;
const MONTH_WHEEL_COOLDOWN_MS = 400;
const MONTH_WHEEL_THRESHOLD = 10;

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

  const { events, error, mutationError, createEvent, updateEvent, deleteEvent } = useCalendarEvents(
    rangeStart,
    rangeEnd,
  );

  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const monthWheelLockedRef = useRef(false);

  const handleMonthWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (mode !== "month") return;
    event.preventDefault();
    if (monthWheelLockedRef.current || Math.abs(event.deltaY) < MONTH_WHEEL_THRESHOLD) return;
    monthWheelLockedRef.current = true;
    if (event.deltaY > 0) goNext();
    else goPrev();
    window.setTimeout(() => {
      monthWheelLockedRef.current = false;
    }, MONTH_WHEEL_COOLDOWN_MS);
  };

  const today = new Date();

  const openCreateModal = (start: Date, end: Date, allDay: boolean) => {
    setContextMenu(null);
    setModalState({ mode: "create", start, end, allDay });
  };

  const openEditModal = (event: CalendarEvent) => {
    setContextMenu(null);
    setModalState({ mode: "edit", event });
  };

  const closeModal = () => setModalState(null);

  const handleSave = async (data: EventModalSaveData) => {
    setIsSaving(true);
    const ok =
      modalState?.mode === "edit"
        ? await updateEvent(modalState.event.id, { ...data, timeZone })
        : await createEvent({ ...data, timeZone });
    setIsSaving(false);
    if (ok) closeModal();
  };

  const handleDeleteFromModal = async () => {
    if (modalState?.mode !== "edit") return;
    setIsSaving(true);
    const ok = await deleteEvent(modalState.event.id);
    setIsSaving(false);
    if (ok) closeModal();
  };

  const handleDeleteById = async (id: string) => {
    await deleteEvent(id);
  };

  const handleDuplicate = async (event: CalendarEvent) => {
    await createEvent({
      owner: event.owner,
      title: `${event.title} (copy)`,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      location: event.location,
      timeZone,
    });
  };

  const handleEventChange = async (event: CalendarEvent, start: Date, end: Date) => {
    await updateEvent(event.id, {
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: event.allDay,
      timeZone,
    });
  };

  const openEventContextMenu = (event: CalendarEvent, x: number, y: number) => {
    const items: ContextMenuItem[] = [
      { label: "Edit event", onSelect: () => openEditModal(event) },
      { label: "Duplicate event", onSelect: () => handleDuplicate(event) },
      { label: "Delete event", danger: true, onSelect: () => handleDeleteById(event.id) },
    ];
    setContextMenu({ x, y, items });
  };

  const openSlotContextMenu = (start: Date, end: Date, allDay: boolean, x: number, y: number) => {
    setContextMenu({
      x,
      y,
      items: [{ label: "New event", onSelect: () => openCreateModal(start, end, allDay) }],
    });
  };

  const handleMonthDayClick = (day: Date) => {
    openCreateModal(day, addDays(day, 1, timeZone), true);
  };

  const handleMonthDayContextMenu = (day: Date, x: number, y: number) => {
    openSlotContextMenu(day, addDays(day, 1, timeZone), true, x, y);
  };

  const handleMonthDragStart = (event: CalendarEvent, dragEvent: React.DragEvent) => {
    dragEvent.dataTransfer.setData("text/plain", event.id);
    dragEvent.dataTransfer.effectAllowed = "move";
  };

  const handleMonthDrop = async (day: Date, dragEvent: React.DragEvent) => {
    dragEvent.preventDefault();
    const id = dragEvent.dataTransfer.getData("text/plain");
    const dragged = events.find((event) => event.id === id);
    if (!dragged) return;

    const originalStart = new Date(dragged.start);
    const originalEnd = new Date(dragged.end);
    const dayDeltaMs = startOfDay(day, timeZone).getTime() - startOfDay(originalStart, timeZone).getTime();
    if (dayDeltaMs === 0) return;

    await updateEvent(dragged.id, {
      start: new Date(originalStart.getTime() + dayDeltaMs).toISOString(),
      end: new Date(originalEnd.getTime() + dayDeltaMs).toISOString(),
      allDay: dragged.allDay,
      timeZone,
    });
  };

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

          <button
            type="button"
            className={styles.newEventButton}
            onClick={() => {
              const start = new Date();
              start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
              openCreateModal(start, new Date(start.getTime() + 60 * 60_000), false);
            }}
          >
            New event
          </button>
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

      <main className={`${styles.main} no-scrollbar`} onWheel={handleMonthWheel}>
        {mode === "week" ? (
          <WeekTimeGrid
            key={rangeStart.toISOString()}
            days={days}
            eventsByDay={eventsByDay}
            today={today}
            timeZone={timeZone}
            onCreateRequest={openCreateModal}
            onEventClick={openEditModal}
            onEventContextMenu={openEventContextMenu}
            onSlotContextMenu={(start, allDay, x, y) => {
              const end = allDay ? addDays(start, 1, timeZone) : new Date(start.getTime() + 60 * 60_000);
              openSlotContextMenu(start, end, allDay, x, y);
            }}
            onEventChange={handleEventChange}
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
                  onClick={() => handleMonthDayClick(day)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    handleMonthDayContextMenu(day, event.clientX, event.clientY);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleMonthDrop(day, event)}
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
                        draggable
                        onDragStart={(dragEvent) => handleMonthDragStart(event, dragEvent)}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          openEditModal(event);
                        }}
                        onContextMenu={(contextEvent) => {
                          contextEvent.preventDefault();
                          contextEvent.stopPropagation();
                          openEventContextMenu(event, contextEvent.clientX, contextEvent.clientY);
                        }}
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

      {modalState && (
        <EventModal
          mode={modalState.mode}
          initialTitle={modalState.mode === "edit" ? modalState.event.title : ""}
          initialOwner={modalState.mode === "edit" ? modalState.event.owner : "user"}
          initialStart={modalState.mode === "edit" ? new Date(modalState.event.start) : modalState.start}
          initialEnd={modalState.mode === "edit" ? new Date(modalState.event.end) : modalState.end}
          initialAllDay={modalState.mode === "edit" ? modalState.event.allDay : modalState.allDay}
          initialLocation={modalState.mode === "edit" ? modalState.event.location ?? "" : ""}
          timeZone={timeZone}
          canDelete={modalState.mode === "edit"}
          isSaving={isSaving}
          error={mutationError}
          onSave={handleSave}
          onDelete={modalState.mode === "edit" ? handleDeleteFromModal : undefined}
          onClose={closeModal}
        />
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
