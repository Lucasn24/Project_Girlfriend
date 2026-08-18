import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { EventModal, type EventModalSaveData } from "../calendar/EventModal";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { useCalendarEvents } from "../../hooks/calendar/useCalendarEvents";
import { useSettings } from "../../hooks/settings/useSettings";
import type { CalendarEvent, CalendarOwner } from "../../types";
import { layoutOverlappingEvents } from "../../utils/calendarLayout";
import { endOfDay, minutesOfDay, startOfDay } from "../../utils/calendarRange";
import { DashboardCard } from "./DashboardCard";
import styles from "./TodayAgendaCard.module.css";

type OwnerFilter = "user" | "partner" | "both";

const FILTER_STORAGE_KEY = "tether:today-agenda-filter";
const HOUR_HEIGHT_REM = 3.5;
const MIN_EVENT_HEIGHT_REM = 1.5;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES_PER_DAY = 24 * 60;

function loadFilter(): OwnerFilter {
  const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
  return raw === "user" || raw === "partner" || raw === "both" ? raw : "both";
}

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function eventTimeLabel(event: CalendarEvent, timeZone: string): string {
  return new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

function clipToToday(
  event: CalendarEvent,
  dayStartMs: number,
  dayEndMs: number,
): { startMinutes: number; endMinutes: number } {
  const clippedStart = Math.max(new Date(event.start).getTime(), dayStartMs);
  const clippedEnd = Math.min(new Date(event.end).getTime(), dayEndMs);
  const startMinutes = (clippedStart - dayStartMs) / 60_000;
  const endMinutes = Math.max((clippedEnd - dayStartMs) / 60_000, startMinutes);
  return { startMinutes, endMinutes };
}

export function TodayAgendaCard() {
  const { userLocationId } = useSettings();
  const timeZone = getLocation(userLocationId).timeZone;
  const today = new Date();
  const dayStart = startOfDay(today, timeZone);
  const dayEnd = endOfDay(today, timeZone);

  const { events, isLoading, error, mutationError, updateEvent, deleteEvent } = useCalendarEvents(dayStart, dayEnd);

  const [filter, setFilter] = useState<OwnerFilter>(loadFilter);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    if (hasAutoScrolledRef.current || isLoading) return;
    const wrap = scrollRef.current;
    const inner = timelineRef.current;
    if (!wrap || !inner) return;
    const nowMinutes = minutesOfDay(new Date(), timeZone);
    const targetPx = (nowMinutes / MINUTES_PER_DAY) * inner.scrollHeight;
    wrap.scrollTop = Math.max(targetPx - wrap.clientHeight / 3, 0);
    hasAutoScrolledRef.current = true;
  }, [isLoading, timeZone]);

  const showUser = filter !== "partner";
  const showPartner = filter !== "user";

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime() + 1;

  const userEvents = useMemo(() => events.filter((event) => event.owner === "user"), [events]);
  const partnerEvents = useMemo(() => events.filter((event) => event.owner === "partner"), [events]);

  const userAllDay = userEvents.filter((event) => event.allDay);
  const userTimed = userEvents.filter((event) => !event.allDay);
  const partnerAllDay = partnerEvents.filter((event) => event.allDay);
  const partnerTimed = partnerEvents.filter((event) => !event.allDay);

  const hasAllDay = (showUser && userAllDay.length > 0) || (showPartner && partnerAllDay.length > 0);
  const nowMinutes = minutesOfDay(new Date(), timeZone);
  const isEmpty =
    !isLoading &&
    !error &&
    (showUser ? userEvents.length : 0) + (showPartner ? partnerEvents.length : 0) === 0;

  const renderColumn = (owner: CalendarOwner, timed: CalendarEvent[]) => {
    const laidOut = layoutOverlappingEvents(timed);
    return (
      <div className={styles.column}>
        <div className={styles.nowLine} style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT_REM}rem` }} />
        {laidOut.map(({ event, column, columns }) => {
          const { startMinutes, endMinutes } = clipToToday(event, dayStartMs, dayEndMs);
          const top = (startMinutes / 60) * HOUR_HEIGHT_REM;
          const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_REM, MIN_EVENT_HEIGHT_REM);
          const widthPct = 100 / columns;
          const leftPct = widthPct * column;
          return (
            <div
              key={event.id}
              className={`${styles.timedEvent} ${owner === "user" ? styles.eventUser : styles.eventPartner}`}
              style={{
                top: `${top}rem`,
                height: `${height}rem`,
                width: `calc(${widthPct}% - 4px)`,
                left: `calc(${leftPct}% + 2px)`,
              }}
              title={event.title}
              onClick={() => setSelectedEvent(event)}
            >
              <span className={styles.timedEventTime}>{eventTimeLabel(event, timeZone)}</span>
              <span className={styles.timedEventTitle}>{event.title}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleSave = async (data: EventModalSaveData) => {
    if (!selectedEvent) return;
    setIsSaving(true);
    const ok = await updateEvent(selectedEvent.id, { ...data, timeZone });
    setIsSaving(false);
    if (ok) setSelectedEvent(null);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setIsSaving(true);
    const ok = await deleteEvent(selectedEvent.id);
    setIsSaving(false);
    if (ok) setSelectedEvent(null);
  };

  return (
    <DashboardCard icon={<CalendarBlankIcon size={16} weight="fill" />} title="Today's activities">
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === "user" ? styles.filterActive : ""}`}
          onClick={() => setFilter("user")}
          aria-pressed={filter === "user"}
        >
          You
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === "both" ? styles.filterActive : ""}`}
          onClick={() => setFilter("both")}
          aria-pressed={filter === "both"}
        >
          Both
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === "partner" ? styles.filterActive : ""}`}
          onClick={() => setFilter("partner")}
          aria-pressed={filter === "partner"}
        >
          {partnerName}
        </button>
      </div>

      {error && <p className={styles.empty}>{error}</p>}
      {!error && isLoading && events.length === 0 && <p className={styles.empty}>Loading…</p>}
      {isEmpty && <p className={styles.empty}>Nothing on the calendar today.</p>}

      {!error && (
        <div className={styles.timeline}>
          {hasAllDay && (
            <div className={styles.allDayRow}>
              <div className={styles.allDayGutter} />
              {showUser && (
                <div className={styles.allDayCell}>
                  {userAllDay.map((event) => (
                    <div
                      key={event.id}
                      className={`${styles.allDayPill} ${styles.eventUser}`}
                      title={event.title}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              )}
              {showPartner && (
                <div className={styles.allDayCell}>
                  {partnerAllDay.map((event) => (
                    <div
                      key={event.id}
                      className={`${styles.allDayPill} ${styles.eventPartner}`}
                      title={event.title}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`${styles.scrollArea} no-scrollbar`} ref={scrollRef}>
            <div className={styles.hourGrid} ref={timelineRef} style={{ height: `${24 * HOUR_HEIGHT_REM}rem` }}>
              <div className={styles.hourLabels}>
                {HOURS.map((hour) => (
                  <div key={hour} className={styles.hourLabelCell} style={{ height: `${HOUR_HEIGHT_REM}rem` }}>
                    {hour > 0 && <span className={styles.hourLabelText}>{formatHourLabel(hour)}</span>}
                  </div>
                ))}
              </div>
              <div
                className={styles.columns}
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${HOUR_HEIGHT_REM}rem)`,
                }}
              >
                {showUser && renderColumn("user", userTimed)}
                {showPartner && renderColumn("partner", partnerTimed)}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventModal
          mode="edit"
          initialTitle={selectedEvent.title}
          initialOwner={selectedEvent.owner}
          initialStart={new Date(selectedEvent.start)}
          initialEnd={new Date(selectedEvent.end)}
          initialAllDay={selectedEvent.allDay}
          initialLocation={selectedEvent.location ?? ""}
          timeZone={timeZone}
          canDelete={selectedEvent.source !== "ical"}
          readOnly={selectedEvent.source === "ical"}
          isSaving={isSaving}
          error={mutationError}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </DashboardCard>
  );
}
