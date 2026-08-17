import { useState } from "react";
import { PencilSimpleIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { deletePhoto, updatePhoto } from "../../api/photoTimeline";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { useSettings } from "../../hooks/settings/useSettings";
import type { PhotoTimelineEntry } from "../../types";
import { getZonedParts, zonedYmdToUtc } from "../../utils/calendarRange";
import styles from "./PhotoLightbox.module.css";

interface PhotoLightboxProps {
  photo: PhotoTimelineEntry;
  onClose: () => void;
  onMutated: () => void;
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

export function PhotoLightbox({ photo, onClose, onMutated }: PhotoLightboxProps) {
  const { userLocationId, partnerLocationId } = useSettings();
  const timeZone = getLocation(photo.owner === "user" ? userLocationId : partnerLocationId).timeZone;

  const [isEditing, setIsEditing] = useState(false);
  const [date, setDate] = useState(() => toDateValue(new Date(photo.timestamp), timeZone));
  const [time, setTime] = useState(() => toTimeValue(new Date(photo.timestamp), timeZone));
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = photo.owner === "user" ? "You" : partnerName;
  const formattedTimestamp = new Date(photo.timestamp).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const [h, min] = time.split(":").map(Number);
      const timestamp = zonedYmdToUtc(y, m, d, h, min, 0, timeZone).toISOString();
      await updatePhoto(photo.id, { timestamp, caption: caption.trim() || null });
      onMutated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update photo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await deletePhoto(photo.id);
      onMutated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <XIcon size={18} weight="bold" />
        </button>

        <img src={photo.originalUrl} alt={photo.caption ?? "Timeline photo"} className={styles.image} />

        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={`${styles.dot} ${photo.owner === "user" ? styles.dotUser : styles.dotPartner}`} />
            <span className={styles.owner}>{displayName}</span>
            <span className={styles.timestamp}>{formattedTimestamp}</span>
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.fieldInputs}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
                <input
                  type="time"
                  className={styles.timeInput}
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
              <input
                className={styles.captionInput}
                placeholder="Add a caption (optional)"
                value={caption}
                maxLength={200}
                onChange={(event) => setCaption(event.target.value)}
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="button" className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {photo.caption && <p className={styles.caption}>{photo.caption}</p>}
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.deleteButton} onClick={handleDelete} disabled={isSaving}>
                  <TrashIcon size={16} weight="bold" />
                  Delete
                </button>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => setIsEditing(true)}
                  disabled={isSaving}
                >
                  <PencilSimpleIcon size={16} weight="bold" />
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
