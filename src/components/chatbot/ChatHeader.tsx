import { DotsThreeVerticalIcon, GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { partnerName } from "../../data/thread";
import { useConnection } from "../../hooks/connection/useConnection";
import styles from "./ChatHeader.module.css";

export function ChatHeader() {
  const { distanceKm, diffLabel } = useConnection();

  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <Avatar initial="L" aiActive />

        <div className={styles.identity}>
          <h1 className={styles.name}>{partnerName}</h1>
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            AI companion active
          </p>
        </div>

        <div className={styles.distanceChip} title="Distance and time difference">
          <GlobeHemisphereWestIcon size={14} className={styles.distanceIcon} />
          {distanceKm.toLocaleString()} km · {diffLabel}
        </div>

        <ThemeToggle />

        <button type="button" aria-label="More options" className={styles.iconButton}>
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
      </div>
    </header>
  );
}
