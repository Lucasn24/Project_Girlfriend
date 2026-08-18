import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getLocation } from "../../data/locations";
import { partnerName } from "../../data/thread";
import { usePhotoTimeline } from "../../hooks/photoTimeline/usePhotoTimeline";
import { useSettings } from "../../hooks/settings/useSettings";
import type { PhotoTimelineEntry } from "../../types";
import {
  formatMinutesSincePhotoDayStart,
  minutesSincePhotoDayStart,
  photoDayEndExclusive,
  photoDayStart,
  PHOTO_DAY_DEFAULT_END_MIN,
  PHOTO_DAY_MIN_SPAN_MIN,
} from "../../utils/photoDay";
import { COLLISION_THRESHOLD_PX, POLAROID_WIDTH_PX } from "./constants";
import { PolaroidStack } from "./PolaroidStack";
import { buildRopePath, ROPE_BAND_HEIGHT, type RopeAnchor } from "./ropePath";
import styles from "./PhotoString.module.css";

interface Cluster {
  anchorX: number;
  members: PhotoTimelineEntry[];
}

interface Domain {
  left: number;
  right: number;
}

/** The x-axis domain (minutes since 7am) shared by both lanes, driven by the actual photos of the day. */
function computeDomain(photos: PhotoTimelineEntry[], userTz: string, partnerTz: string): Domain {
  const allMinutes = photos.map((photo) =>
    minutesSincePhotoDayStart(new Date(photo.timestamp), photo.owner === "user" ? userTz : partnerTz),
  );

  let left = allMinutes.length ? Math.min(...allMinutes) : 0;
  let right = Math.max(PHOTO_DAY_DEFAULT_END_MIN, allMinutes.length ? Math.max(...allMinutes) : PHOTO_DAY_DEFAULT_END_MIN);

  if (right - left < PHOTO_DAY_MIN_SPAN_MIN) {
    right = Math.min(1440, left + PHOTO_DAY_MIN_SPAN_MIN);
    if (right - left < PHOTO_DAY_MIN_SPAN_MIN) left = Math.max(0, right - PHOTO_DAY_MIN_SPAN_MIN);
  }

  return { left, right };
}

function clusterRow(photos: PhotoTimelineEntry[], ownerTz: string, trackWidthPx: number, domain: Domain): Cluster[] {
  const sorted = [...photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const span = Math.max(domain.right - domain.left, 1);
  const clusters: Cluster[] = [];
  for (const photo of sorted) {
    const minutes = minutesSincePhotoDayStart(new Date(photo.timestamp), ownerTz);
    const raw = ((minutes - domain.left) / span) * trackWidthPx;
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

interface Tick {
  minute: number;
  label: string;
}

/** Whole-hour ticks across the dynamic domain, plus its exact start/end when they fall off-hour. */
function buildTicks(domain: Domain): Tick[] {
  const ticks: Tick[] = [];
  const firstHourMinute = Math.ceil(domain.left / 60) * 60;
  for (let minute = firstHourMinute; minute <= domain.right; minute += 60) {
    ticks.push({ minute, label: formatMinutesSincePhotoDayStart(minute) });
  }

  if (!ticks.length || ticks[0].minute - domain.left > 20) {
    ticks.unshift({ minute: domain.left, label: formatMinutesSincePhotoDayStart(domain.left) });
  }
  if (ticks[ticks.length - 1].minute < domain.right - 20) {
    ticks.push({ minute: domain.right, label: formatMinutesSincePhotoDayStart(domain.right) });
  }
  return ticks;
}

interface PhotoStringProps {
  cursor: Date;
  onOpenLightbox: (photo: PhotoTimelineEntry) => void;
  refreshKey?: number;
}

export function PhotoString({ cursor, onOpenLightbox, refreshKey }: PhotoStringProps) {
  const { userLocationId, partnerLocationId } = useSettings();
  const userTz = getLocation(userLocationId).timeZone;
  const partnerTz = getLocation(partnerLocationId).timeZone;
  const ropeGradientId = useId();

  const rangeStart = useMemo(() => photoDayStart(cursor, userTz), [cursor, userTz]);
  const rangeEndExclusive = useMemo(() => photoDayEndExclusive(cursor, userTz), [cursor, userTz]);
  const rangeEnd = useMemo(() => new Date(rangeEndExclusive.getTime() - 1), [rangeEndExclusive]);
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
  const isToday = now.getTime() >= rangeStart.getTime() && now.getTime() < rangeEndExclusive.getTime();
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const userPhotos = useMemo(() => photos.filter((photo) => photo.owner === "user"), [photos]);
  const partnerPhotos = useMemo(() => photos.filter((photo) => photo.owner === "partner"), [photos]);

  const domain = useMemo(() => computeDomain(photos, userTz, partnerTz), [photos, userTz, partnerTz]);
  const domainSpan = Math.max(domain.right - domain.left, 1);

  const userClusters = useMemo(
    () => (trackWidth ? clusterRow(userPhotos, userTz, trackWidth, domain) : []),
    [userPhotos, userTz, trackWidth, domain],
  );
  const partnerClusters = useMemo(
    () => (trackWidth ? clusterRow(partnerPhotos, partnerTz, trackWidth, domain) : []),
    [partnerPhotos, partnerTz, trackWidth, domain],
  );

  const ticks = useMemo(() => buildTicks(domain), [domain]);

  const ropePath = useMemo(() => {
    if (!trackWidth) return "";
    const anchors: RopeAnchor[] = [
      ...userClusters.map((cluster) => ({ x: cluster.anchorX, pull: -1 as const })),
      ...partnerClusters.map((cluster) => ({ x: cluster.anchorX, pull: 1 as const })),
    ];
    return buildRopePath(trackWidth, anchors);
  }, [trackWidth, userClusters, partnerClusters]);

  const nowMinutes = isToday ? minutesSincePhotoDayStart(now, userTz) : null;
  const nowX =
    nowMinutes !== null && trackWidth && nowMinutes >= domain.left && nowMinutes <= domain.right
      ? ((nowMinutes - domain.left) / domainSpan) * trackWidth
      : null;

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

        <div className={styles.stringBand}>
          {ropePath && (
            <svg
              className={styles.stringSvg}
              viewBox={`0 0 ${trackWidth} ${ROPE_BAND_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={ropeGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8935a" />
                  <stop offset="55%" stopColor="#8a5a34" />
                  <stop offset="100%" stopColor="#6a421f" />
                </linearGradient>
              </defs>
              <path d={ropePath} fill="none" stroke={`url(#${ropeGradientId})`} strokeWidth={5} strokeLinecap="round" />
            </svg>
          )}
        </div>

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
          {ticks.map((tick) => (
            <span
              key={tick.minute}
              className={styles.tickLabel}
              style={{ left: `${((tick.minute - domain.left) / domainSpan) * 100}%` }}
            >
              {tick.label}
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
