import { CalendarBlankIcon } from "@phosphor-icons/react";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useSettings } from "../../hooks/useSettings";
import type { CalendarEvent } from "../../types";
import { endOfDay, startOfDay } from "../../utils/calendarRange";
import { DashboardCard } from "./DashboardCard";
import styles from "./TodayAgendaCard.module.css";

function eventTimeLabel(event: CalendarEvent, timeZone: string): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

export function TodayAgendaCard() {
  const { userLocationId } = useSettings();
  const timeZone = getLocation(userLocationId).timeZone;
  const today = new Date();
  const { events, isLoading, error } = useCalendarEvents(startOfDay(today, timeZone), endOfDay(today, timeZone));

  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <DashboardCard icon={<CalendarBlankIcon size={16} weight="fill" />} title="Today's activities" draggable>
      {error && <p className={styles.empty}>{error}</p>}
      {!error && isLoading && sorted.length === 0 && <p className={styles.empty}>Loading…</p>}
      {!error && !isLoading && sorted.length === 0 && (
        <p className={styles.empty}>Nothing on the calendar today.</p>
      )}
      {sorted.length > 0 && (
        <ul className={styles.list}>
          {sorted.map((event) => (
            <li key={event.id} className={styles.item}>
              <span
                className={`${styles.dot} ${event.owner === "user" ? styles.dotUser : styles.dotPartner}`}
                aria-hidden="true"
              />
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>{event.title}</p>
                <p className={styles.itemMeta}>
                  {eventTimeLabel(event, timeZone)} · {event.owner === "user" ? "You" : partnerName}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
