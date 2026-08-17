import { BellRingingIcon, MoonStarsIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import { useConnection } from "../../hooks/connection/useConnection";
import styles from "./DisclosureBanner.module.css";

export function DisclosureBanner() {
  const { partnerLocation, partnerIsAsleep, partnerWakeLabel } = useConnection();

  if (!partnerIsAsleep) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <span className={styles.iconWrap}>
          <MoonStarsIcon size={16} weight="fill" />
        </span>

        <div className={styles.body}>
          <p className={styles.text}>
            <span className={styles.name}>
              {partnerName} is asleep in {partnerLocation.city}.
            </span>{" "}
            His AI companion is replying in his voice until {partnerWakeLabel} his time.
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
