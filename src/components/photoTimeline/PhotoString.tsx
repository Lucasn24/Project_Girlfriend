import { useEffect, useMemo, useRef, useState } from "react";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { usePhotoTimeline } from "../../hooks/photoTimeline/usePhotoTimeline";
import { useSettings } from "../../hooks/settings/useSettings";
import type { PhotoTimelineEntry } from "../../types";
import { endOfDay, isSameDay, minutesOfDay, startOfDay } from "../../utils/calendarRange";
import { COLLISION_THRESHOLD_PX, POLAROID_WIDTH_PX } from "./constants";
import { PolaroidStack } from "./PolaroidStack";
import styles from "./PhotoString.module.css";

interface Cluster {
  anchorX: number;
  members: PhotoTimelineEntry[];
}

function clusterRow(photos: PhotoTimelineEntry[], ownerTz: string, trackWidthPx: number): Cluster[] {
  const sorted = [...photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const clusters: Cluster[] = [];
  for (const photo of sorted) {
    const minutes = minutesOfDay(new Date(photo.timestamp), ownerTz);
    const raw = (minutes / 1440) * trackWidthPx;
    const xPx = Math.min(Math.max(raw, POLAROID_WIDTH_PX / 2), trackWidthPx - POLAROID_WIDTH_PX / 2);
    const last = clusters[clusters.length - 1];
    if (last && xPx - last.anchorX < COLLISION_THRESHOLD_PX) {
      last.members.push(photo);
    } else {
      clusters.push({ anchorX: xPx, members: [photo] });
    }
  }
  return clusters;
}

function tzAbbrev(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

function tickLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

const TICK_HOURS = [0, 6, 12, 18, 24];

interface PhotoStringProps {
  cursor: Date;
  onOpenLightbox: (photo: PhotoTimelineEntry) => void;
  refreshKey?: number;
}

export function PhotoString({ cursor, onOpenLightbox, refreshKey }: PhotoStringProps) {
  const { userLocationId, partnerLocationId } = useSettings();
  const userTz = getLocation(userLocationId).timeZone;
  const partnerTz = getLocation(partnerLocationId).timeZone;

  const rangeStart = useMemo(() => startOfDay(cursor, userTz), [cursor, userTz]);
  const rangeEnd = useMemo(() => endOfDay(cursor, userTz), [cursor, userTz]);
  const { photos, isLoading, error, refetch } = usePhotoTimeline(rangeStart, rangeEnd);

  useEffect(() => {
    if (refreshKey !== undefined) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setTrackWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [now, setNow] = useState(() => new Date());
  const isToday = isSameDay(cursor, now, userTz);
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const userPhotos = useMemo(() => photos.filter((photo) => photo.owner === "user"), [photos]);
  const partnerPhotos = useMemo(() => photos.filter((photo) => photo.owner === "partner"), [photos]);

  const userClusters = useMemo(
    () => (trackWidth ? clusterRow(userPhotos, userTz, trackWidth) : []),
    [userPhotos, userTz, trackWidth],
  );
  const partnerClusters = useMemo(
    () => (trackWidth ? clusterRow(partnerPhotos, partnerTz, trackWidth) : []),
    [partnerPhotos, partnerTz, trackWidth],
  );

  const nowX = isToday && trackWidth ? (minutesOfDay(now, userTz) / 1440) * trackWidth : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotUser}`} aria-hidden="true" />
          You <span className={styles.tzTag}>{tzAbbrev(cursor, userTz)}</span>
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotPartner}`} aria-hidden="true" />
          {partnerName} <span className={styles.tzTag}>{tzAbbrev(cursor, partnerTz)}</span>
        </span>
      </div>

      <div className={styles.trackOuter} ref={trackRef}>
        <div className={styles.lane}>
          {userClusters.map((cluster) => (
            <PolaroidStack
              key={cluster.members[0].id}
              members={cluster.members}
              x={cluster.anchorX}
              side="above"
              onOpen={onOpenLightbox}
            />
          ))}
        </div>

        <div className={styles.string} />

        <div className={`${styles.lane} ${styles.laneBelow}`}>
          {partnerClusters.map((cluster) => (
            <PolaroidStack
              key={cluster.members[0].id}
              members={cluster.members}
              x={cluster.anchorX}
              side="below"
              onOpen={onOpenLightbox}
            />
          ))}
        </div>

        <div className={styles.axisStrip}>
          {TICK_HOURS.map((hour) => (
            <span key={hour} className={styles.tickLabel} style={{ left: `${(hour / 24) * 100}%` }}>
              {tickLabel(hour)}
            </span>
          ))}
        </div>

        {nowX !== null && <div className={styles.nowIndicator} style={{ left: `${nowX}px` }} />}
      </div>

      {isLoading && <p className={styles.status}>Loading…</p>}
      {error && <p className={styles.statusError}>{error}</p>}
      {!isLoading && !error && photos.length === 0 && (
        <p className={styles.status}>No photos yet for this day.</p>
      )}
    </div>
  );
}
