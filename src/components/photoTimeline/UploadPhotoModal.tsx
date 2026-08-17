import { useRef, useState } from "react";
import { UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { uploadPhoto } from "../../api/photoTimeline";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { useSettings } from "../../hooks/settings/useSettings";
import type { PhotoTimelineOwner } from "../../types";
import { getZonedParts, zonedYmdToUtc } from "../../utils/calendarRange";
import { compressImageFile } from "../../utils/photoCompression";
import styles from "./UploadPhotoModal.module.css";

interface UploadPhotoModalProps {
  onClose: () => void;
  onUploaded: () => void;
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

export function UploadPhotoModal({ onClose, onUploaded }: UploadPhotoModalProps) {
  const { userLocationId, partnerLocationId } = useSettings();
  const userTz = getLocation(userLocationId).timeZone;
  const partnerTz = getLocation(partnerLocationId).timeZone;

  const [owner, setOwner] = useState<PhotoTimelineOwner>("user");
  const ownerTz = owner === "user" ? userTz : partnerTz;

  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateValue(new Date(), ownerTz));
  const [time, setTime] = useState(() => toTimeValue(new Date(), ownerTz));
  const [caption, setCaption] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOwnerChange = (next: PhotoTimelineOwner) => {
    // Re-express the same moment-of-day in the newly selected owner's local time,
    // so switching owners doesn't silently shift the entered time.
    const nextTz = next === "user" ? userTz : partnerTz;
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    const asUtc = zonedYmdToUtc(y, m, d, h, min, 0, ownerTz);
    setOwner(next);
    setDate(toDateValue(asUtc, nextTz));
    setTime(toTimeValue(asUtc, nextTz));
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(next ? URL.createObjectURL(next) : null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a photo to upload.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const [h, min] = time.split(":").map(Number);
      const timestamp = zonedYmdToUtc(y, m, d, h, min, 0, ownerTz).toISOString();
      const compressed = await compressImageFile(file);

      await uploadPhoto({ owner, timestamp, caption: caption.trim() || undefined, file: compressed });
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Add a photo</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <button type="button" className={styles.slot} onClick={() => inputRef.current?.click()}>
            {objectUrl ? (
              <img src={objectUrl} alt="Selected" className={styles.slotImage} />
            ) : (
              <span className={styles.slotEmpty}>
                <UploadSimpleIcon size={20} />
                Choose photo
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenInput}
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />

          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segment} ${owner === "user" ? styles.segmentActive : ""}`}
              onClick={() => handleOwnerChange("user")}
              aria-pressed={owner === "user"}
            >
              You
            </button>
            <button
              type="button"
              className={`${styles.segment} ${owner === "partner" ? styles.segmentActive : ""}`}
              onClick={() => handleOwnerChange("partner")}
              aria-pressed={owner === "partner"}
            >
              {partnerName}
            </button>
          </div>

          <div className={styles.dateField}>
            <span className={styles.fieldLabel}>Taken at</span>
            <div className={styles.fieldInputs}>
              <input
                type="date"
                className={styles.dateInput}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              <input
                type="time"
                className={styles.timeInput}
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </div>
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
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={isSaving}>
              {isSaving ? "Uploading…" : "Add to string"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
