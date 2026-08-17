import { HeartIcon } from "@phosphor-icons/react";
import { useCouplePhoto } from "../../hooks/couplePhoto/useCouplePhoto";
import { DashboardCard } from "./DashboardCard";
import styles from "./CouplePhotoCard.module.css";

export function CouplePhotoCard() {
  const { state, isLoading } = useCouplePhoto();

  return (
    <DashboardCard icon={<HeartIcon size={16} weight="fill" />} title="Couple photo" draggable>
      {isLoading && <p className={styles.empty}>Loading…</p>}
      {!isLoading && !state.generatedUrl && (
        <p className={styles.empty}>No couple photo yet — generate one from the Couple photo page.</p>
      )}
      {state.generatedUrl && (
        <img src={state.generatedUrl} alt="Generated couple photo" className={styles.image} />
      )}
    </DashboardCard>
  );
}
