import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import styles from "./DayNav.module.css";

interface DayNavProps {
  label: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function DayNav({ label, isToday, onPrev, onNext, onToday }: DayNavProps) {
  return (
    <div className={styles.nav}>
      <button type="button" className={styles.navButton} onClick={onPrev} aria-label="Previous day">
        <CaretLeftIcon size={16} weight="bold" />
      </button>
      <span className={styles.label}>{label}</span>
      <button type="button" className={styles.navButton} onClick={onNext} aria-label="Next day">
        <CaretRightIcon size={16} weight="bold" />
      </button>
      {!isToday && (
        <button type="button" className={styles.todayButton} onClick={onToday}>
          Today
        </button>
      )}
    </div>
  );
}
