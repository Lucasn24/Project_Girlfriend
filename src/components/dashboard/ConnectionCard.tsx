import { GlobeHemisphereWestIcon, MapPinIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import { useConnection } from "../../hooks/connection/useConnection";
import { DashboardCard } from "./DashboardCard";
import styles from "./ConnectionCard.module.css";

export function ConnectionCard() {
  const { userTime, partnerTime, userLocation, partnerLocation, distanceKm, diffLabel } =
    useConnection();

  return (
    <DashboardCard icon={<GlobeHemisphereWestIcon size={16} weight="fill" />} title="Where you both are" draggable>
      <div className={styles.clocks}>
        <div className={styles.clock}>
          <p className={styles.clockLabel}>You</p>
          <p className={styles.clockTime}>{userTime}</p>
          <p className={styles.clockPlace}>{userLocation.city}</p>
        </div>
        <div className={styles.clock}>
          <p className={styles.clockLabel}>{partnerName}</p>
          <p className={styles.clockTime}>{partnerTime}</p>
          <p className={styles.clockPlace}>{partnerLocation.city}</p>
        </div>
      </div>
      <div className={styles.meta}>
        <MapPinIcon size={14} weight="fill" className={styles.metaIcon} />
        {distanceKm.toLocaleString()} km apart · {diffLabel}
      </div>
    </DashboardCard>
  );
}
