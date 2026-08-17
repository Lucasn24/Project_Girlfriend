import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { DayNav } from "../components/photoTimeline/DayNav";
import { PhotoLightbox } from "../components/photoTimeline/PhotoLightbox";
import { PhotoString } from "../components/photoTimeline/PhotoString";
import { UploadPhotoModal } from "../components/photoTimeline/UploadPhotoModal";
import { WeekGallery } from "../components/photoTimeline/WeekGallery";
import { getLocation } from "../data/locations";
import { useSettings } from "../hooks/settings/useSettings";
import type { PhotoTimelineEntry } from "../types";
import { addDays, isSameDay } from "../utils/calendarRange";
import styles from "./PhotoTimelinePage.module.css";

type Mode = "string" | "week";

function formatDayLabel(cursor: Date, timeZone: string): string {
  return cursor.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", timeZone });
}

export function PhotoTimelinePage() {
  const [mode, setMode] = useState<Mode>("string");
  const [cursor, setCursor] = useState(() => new Date());
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoTimelineEntry | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { userLocationId } = useSettings();
  const timeZone = getLocation(userLocationId).timeZone;
  const isToday = isSameDay(cursor, new Date(), timeZone);

  const bumpRefresh = () => setRefreshKey((key) => key + 1);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Photo timeline</h1>
          <p className={styles.subtitle}>Polaroids on a string, one day at a time.</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segment} ${mode === "string" ? styles.segmentActive : ""}`}
              onClick={() => setMode("string")}
              aria-pressed={mode === "string"}
            >
              String
            </button>
            <button
              type="button"
              className={`${styles.segment} ${mode === "week" ? styles.segmentActive : ""}`}
              onClick={() => setMode("week")}
              aria-pressed={mode === "week"}
            >
              Week gallery
            </button>
          </div>

          {mode === "string" && (
            <DayNav
              label={formatDayLabel(cursor, timeZone)}
              isToday={isToday}
              onPrev={() => setCursor((prev) => addDays(prev, -1, timeZone))}
              onNext={() => setCursor((prev) => addDays(prev, 1, timeZone))}
              onToday={() => setCursor(new Date())}
            />
          )}

          <button type="button" className={styles.addButton} onClick={() => setUploadOpen(true)}>
            <PlusIcon size={16} weight="bold" />
            Add photo
          </button>
        </div>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        {mode === "string" ? (
          <PhotoString cursor={cursor} onOpenLightbox={setLightboxPhoto} refreshKey={refreshKey} />
        ) : (
          <WeekGallery
            cursor={cursor}
            onCursorChange={setCursor}
            onOpenLightbox={setLightboxPhoto}
            refreshKey={refreshKey}
          />
        )}
      </main>

      {uploadOpen && <UploadPhotoModal onClose={() => setUploadOpen(false)} onUploaded={bumpRefresh} />}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onMutated={bumpRefresh} />
      )}
    </div>
  );
}
