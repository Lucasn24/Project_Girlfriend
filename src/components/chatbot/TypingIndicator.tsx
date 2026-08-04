import { SparkleIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import styles from "./TypingIndicator.module.css";

export function TypingIndicator() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.badge}>
        <SparkleIcon size={11} weight="fill" />
        {partnerName}'s AI is typing
      </span>
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
