import { useState } from "react";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import type { CalendarOwner } from "../../types";
import { addDays, getZonedParts, zonedYmdToUtc } from "../../utils/calendarRange";
import styles from "./EventModal.module.css";

export interface EventModalSaveData {
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

interface EventModalProps {
  mode: "create" | "edit";
  initialTitle: string;
  initialOwner: CalendarOwner;
  initialStart: Date;
  initialEnd: Date;
  initialAllDay: boolean;
  initialLocation: string;
  timeZone: string;
  canDelete: boolean;
  readOnly?: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: (data: EventModalSaveData) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateValue(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toTimeValue(date: Date, timeZone: string): string {
  const { hour, minute } = getZonedParts(date, timeZone);
  return `${pad(hour)}:${pad(minute)}`;
}

function parseDateValue(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function parseTimeValue(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

export function EventModal({
  mode,
  initialTitle,
  initialOwner,
  initialStart,
  initialEnd,
  initialAllDay,
  initialLocation,
  timeZone,
  canDelete,
  readOnly = false,
  isSaving,
  error,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [owner, setOwner] = useState<CalendarOwner>(initialOwner);
  const [allDay, setAllDay] = useState(initialAllDay);
  const [location, setLocation] = useState(initialLocation);

  const [startDate, setStartDate] = useState(() => toDateValue(initialStart, timeZone));
  const [startTime, setStartTime] = useState(() => toTimeValue(initialStart, timeZone));
  const [endDate, setEndDate] = useState(() =>
    toDateValue(initialAllDay ? addDays(initialEnd, -1, timeZone) : initialEnd, timeZone),
  );
  const [endTime, setEndTime] = useState(() => toTimeValue(initialEnd, timeZone));

  const [formError, setFormError] = useState<string | null>(null);

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      // Collapse to a single-day all-day event by default when switching on.
      setEndDate(startDate);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Give the event a title.");
      return;
    }

    const start = parseDateValue(startDate);
    const end = parseDateValue(endDate);

    let startIso: string;
    let endIso: string;

    if (allDay) {
      startIso = zonedYmdToUtc(start.year, start.month, start.day, 0, 0, 0, timeZone).toISOString();
      const exclusiveEnd = addDays(
        zonedYmdToUtc(end.year, end.month, end.day, 0, 0, 0, timeZone),
        1,
        timeZone,
      );
      endIso = exclusiveEnd.toISOString();
    } else {
      const startTimeParts = parseTimeValue(startTime);
      const endTimeParts = parseTimeValue(endTime);
      startIso = zonedYmdToUtc(
        start.year,
        start.month,
        start.day,
        startTimeParts.hour,
        startTimeParts.minute,
        0,
        timeZone,
      ).toISOString();
      endIso = zonedYmdToUtc(
        end.year,
        end.month,
        end.day,
        endTimeParts.hour,
        endTimeParts.minute,
        0,
        timeZone,
      ).toISOString();
    }

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setFormError("End can't be before start.");
      return;
    }

    setFormError(null);
    onSave({ owner, title: title.trim(), start: startIso, end: endIso, allDay, location: location.trim() || undefined });
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>{mode === "create" ? "New event" : "Edit event"}</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.titleInput}
            placeholder="Add a title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={readOnly}
            autoFocus
          />

          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segment} ${owner === "user" ? styles.segmentActive : ""}`}
              onClick={() => setOwner("user")}
              aria-pressed={owner === "user"}
              disabled={readOnly}
            >
              You
            </button>
            <button
              type="button"
              className={`${styles.segment} ${owner === "partner" ? styles.segmentActive : ""}`}
              onClick={() => setOwner("partner")}
              aria-pressed={owner === "partner"}
              disabled={readOnly}
            >
              {partnerName}
            </button>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => handleAllDayToggle(event.target.checked)}
              disabled={readOnly}
            />
            All day
          </label>

          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <span className={styles.fieldLabel}>Start</span>
              <div className={styles.fieldInputs}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  disabled={readOnly}
                  required
                />
                {!allDay && (
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={readOnly}
                    required
                  />
                )}
              </div>
            </div>

            <div className={styles.dateField}>
              <span className={styles.fieldLabel}>End</span>
              <div className={styles.fieldInputs}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  disabled={readOnly}
                  required
                />
                {!allDay && (
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    disabled={readOnly}
                    required
                  />
                )}
              </div>
            </div>
          </div>

          <input
            className={styles.locationInput}
            placeholder="Add a location (optional)"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={readOnly}
          />

          {readOnly && <p className={styles.readOnlyNote}>Synced from a calendar feed — read-only here.</p>}
          {!readOnly && (formError || error) && <p className={styles.error}>{formError ?? error}</p>}

          <div className={styles.actions}>
            {!readOnly && canDelete && onDelete && (
              <button type="button" className={styles.deleteButton} onClick={onDelete} disabled={isSaving}>
                <TrashIcon size={16} weight="bold" />
                Delete
              </button>
            )}
            <div className={styles.actionsRight}>
              {readOnly ? (
                <button type="button" className={styles.cancelButton} onClick={onClose}>
                  Close
                </button>
              ) : (
                <>
                  <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveButton} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
