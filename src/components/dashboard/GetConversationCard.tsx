import { CloudArrowDownIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import { DashboardCard } from "./DashboardCard";
import styles from "./GetConversationCard.module.css";

export function GetConversationCard() {
  return (
    <DashboardCard icon={<CloudArrowDownIcon size={16} weight="fill" />} title="Get conversation" draggable>
      <p className={styles.description}>
        Pull in what {partnerName} has been chatting about, so you can stay up to date.
      </p>
      <button type="button" className={styles.getButton} disabled>
        Get conversation
      </button>
      <p className={styles.status}>Not connected yet</p>
    </DashboardCard>
  );
}
