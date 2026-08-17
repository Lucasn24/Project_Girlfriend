import type { PhotoTimelineEntry } from "../../types";
import { seededTiltDeg } from "../../utils/polaroidTilt";
import styles from "./Polaroid.module.css";

interface PolaroidProps {
  photo: PhotoTimelineEntry;
  clipSide: "above" | "below";
  onClick?: () => void;
  badge?: number;
  peek?: boolean;
  compact?: boolean;
}

function Clothespin({ clipSide }: { clipSide: "above" | "below" }) {
  return (
    <svg
      className={`${styles.pin} ${clipSide === "above" ? styles.pinBottom : styles.pinTop}`}
      viewBox="0 0 20 28"
      aria-hidden="true"
    >
      <rect x="7" y="0" width="6" height="28" rx="2.5" fill="#c8935a" />
      <rect x="0" y="10" width="20" height="4" rx="2" fill="#a97540" />
      <circle cx="10" cy="12" r="2" fill="#8a5c30" />
    </svg>
  );
}

export function Polaroid({ photo, clipSide, onClick, badge, peek, compact }: PolaroidProps) {
  const tilt = seededTiltDeg(photo.id);
  const className = `${styles.card} ${peek ? styles.cardPeek : ""} ${compact ? styles.cardCompact : ""}`;
  const style = { transform: `rotate(${tilt}deg)` };

  const content = (
    <>
      {!peek && <Clothespin clipSide={clipSide} />}
      <div className={styles.photoWrap}>
        <img src={photo.thumbUrl} alt={photo.caption ?? "Timeline photo"} className={styles.photo} loading="lazy" />
      </div>
      {!peek && <div className={styles.caption}>{photo.caption}</div>}
      {typeof badge === "number" && badge > 0 && <span className={styles.badge}>+{badge}</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
