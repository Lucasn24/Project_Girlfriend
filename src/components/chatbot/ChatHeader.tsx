import {
  CaretLeftIcon,
  DotsThreeVerticalIcon,
  GlobeHemisphereWestIcon,
} from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { partnerName } from "../../data/thread";
import styles from "./ChatHeader.module.css";

export function ChatHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <button type="button" aria-label="Go back" className={styles.iconButton}>
          <CaretLeftIcon size={20} />
        </button>

        <Avatar initial="M" aiActive />

        <div className={styles.identity}>
          <h1 className={styles.name}>{partnerName}</h1>
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            AI companion active
          </p>
        </div>

        <div className={styles.distanceChip} title="Distance and time difference">
          <GlobeHemisphereWestIcon size={14} className={styles.distanceIcon} />
          10,850 km · 14h ahead
        </div>

        <ThemeToggle />

        <button type="button" aria-label="More options" className={styles.iconButton}>
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
      </div>
    </header>
  );
}
