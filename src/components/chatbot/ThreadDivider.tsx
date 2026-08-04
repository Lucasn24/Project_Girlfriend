import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import type { Divider } from "../../types";
import styles from "./ThreadDivider.module.css";

export function ThreadDivider({ label, icon }: Divider) {
  return (
    <div role="separator" className={styles.divider}>
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.content}>
        {icon === "moon" ? (
          <MoonStarsIcon
            size={13}
            className={`${styles.icon} ${styles.iconMoon}`}
          />
        ) : (
          <SunIcon size={13} className={`${styles.icon} ${styles.iconSun}`} />
        )}
        <span className={styles.label}>{label}</span>
      </span>
      <span className={styles.line} aria-hidden="true" />
    </div>
  );
}
