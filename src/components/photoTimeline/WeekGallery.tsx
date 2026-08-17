import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useMemo } from "react";
import { getLocation } from "../../data/locations";
import { usePhotoTimeline } from "../../hooks/photoTimeline/usePhotoTimeline";
import { useSettings } from "../../hooks/settings/useSettings";
import type { PhotoTimelineEntry } from "../../types";
import { addDays, endOfWeek, startOfWeek } from "../../utils/calendarRange";
import { DayNav } from "./DayNav";
import styles from "./WeekGallery.module.css";

function formatWeekLabel(weekStart: Date, timeZone: string): string {
  const weekEnd = addDays(weekStart, 6, timeZone);
  const startLabel = weekStart.toLocaleDateString([], { month: "short", day: "numeric", timeZone });
  const endLabel = weekEnd.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric", timeZone });
  return `${startLabel} – ${endLabel}`;
}

interface WeekGalleryProps {
  cursor: Date;
  onCursorChange: (next: Date) => void;
  onOpenLightbox: (photo: PhotoTimelineEntry) => void;
  refreshKey?: number;
}

export function WeekGallery({ cursor, onCursorChange, onOpenLightbox, refreshKey }: WeekGalleryProps) {
  const { userLocationId } = useSettings();
  const timeZone = getLocation(userLocationId).timeZone;

  const rangeStart = useMemo(() => startOfWeek(cursor, timeZone), [cursor, timeZone]);
  const rangeEnd = useMemo(() => endOfWeek(cursor, timeZone), [cursor, timeZone]);
  const { photos, isLoading, error, refetch } = usePhotoTimeline(rangeStart, rangeEnd);

  useEffect(() => {
    if (refreshKey !== undefined) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const isThisWeek = startOfWeek(new Date(), timeZone).getTime() === rangeStart.getTime();

  const exportUrl = `/api/photo-timeline/export?start=${encodeURIComponent(rangeStart.toISOString())}&end=${encodeURIComponent(rangeEnd.toISOString())}`;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <DayNav
          label={formatWeekLabel(rangeStart, timeZone)}
          isToday={isThisWeek}
          onPrev={() => onCursorChange(addDays(cursor, -7, timeZone))}
          onNext={() => onCursorChange(addDays(cursor, 7, timeZone))}
          onToday={() => onCursorChange(new Date())}
        />
        {photos.length > 0 && (
          <a className={styles.exportButton} href={exportUrl} download>
            <DownloadSimpleIcon size={16} weight="bold" />
            Export ZIP
          </a>
        )}
      </div>

      {isLoading && <p className={styles.status}>Loading…</p>}
      {error && <p className={styles.statusError}>{error}</p>}
      {!isLoading && !error && photos.length === 0 && <p className={styles.status}>No photos this week yet.</p>}

      {photos.length > 0 && (
        <div className={styles.grid}>
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className={styles.tile}
              onClick={() => onOpenLightbox(photo)}
            >
              <img src={photo.thumbUrl} alt={photo.caption ?? "Timeline photo"} className={styles.tileImage} />
              <span className={`${styles.ownerDot} ${photo.owner === "user" ? styles.dotUser : styles.dotPartner}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
