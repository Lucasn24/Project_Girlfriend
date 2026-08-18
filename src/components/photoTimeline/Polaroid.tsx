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
      <path
        d="M8 0.5
           C 6.2 0.5 5.4 2.1 5.7 4.2
           C 6 6.8 6.8 8.3 7 10
           C 6.3 10.9 6 12.1 7 13
           L 7 26
           C 7 27.3 8 27.6 8.5 27.6
           C 9 27.6 9.6 27.2 9.6 26.3
           L 9.6 14.6
           L 10.4 14.6
           L 10.4 26.3
           C 10.4 27.2 11 27.6 11.5 27.6
           C 12 27.6 13 27.3 13 26
           L 13 13
           C 14 12.1 13.7 10.9 13 10
           C 13.2 8.3 14 6.8 14.3 4.2
           C 14.6 2.1 13.8 0.5 12 0.5
           C 11.1 0.5 10.7 1.3 10 1.3
           C 9.3 1.3 8.9 0.5 8 0.5
           Z"
        fill="#c8935a"
      />
      <ellipse cx="10" cy="11.5" rx="5.6" ry="2.7" fill="#a97540" />
      <ellipse cx="10" cy="11.5" rx="2.6" ry="1.5" fill="#8a5c30" />
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
