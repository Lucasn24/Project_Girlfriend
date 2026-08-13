import { BellRingingIcon, MoonStarsIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import styles from "./DisclosureBanner.module.css";

export function DisclosureBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.row}>
        <span className={styles.iconWrap}>
          <MoonStarsIcon size={16} weight="fill" />
        </span>

        <div className={styles.body}>
          <p className={styles.text}>
            <span className={styles.name}>{partnerName} is asleep in Birmingham.</span>{" "}
            His AI companion is replying in his voice until 7:00 AM his time.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.linkButton}>
              How this works
            </button>
            <button type="button" className={styles.nudgeButton}>
              <BellRingingIcon size={13} weight="bold" />
              Nudge {partnerName} instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
