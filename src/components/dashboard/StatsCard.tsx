import { ChatCircleTextIcon } from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import type { ThreadItem } from "../../types";
import { DashboardCard } from "./DashboardCard";
import styles from "./StatsCard.module.css";

interface StatsCardProps {
  items: ThreadItem[];
}

export function StatsCard({ items }: StatsCardProps) {
  const messages = items.filter((item) => item.kind === "message");
  const fromYou = messages.filter((message) => message.sender === "you").length;
  const fromPartner = messages.length - fromYou;

  if (messages.length === 0) {
    return (
      <DashboardCard icon={<ChatCircleTextIcon size={16} weight="fill" />} title="This conversation">
        <p className={styles.empty}>No messages yet — say hi to get started.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard icon={<ChatCircleTextIcon size={16} weight="fill" />} title="This conversation">
      <div className={styles.grid}>
        <div className={styles.stat}>
          <p className={styles.statValue}>{messages.length}</p>
          <p className={styles.statLabel}>Total</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statValue}>{fromYou}</p>
          <p className={styles.statLabel}>From you</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statValue}>{fromPartner}</p>
          <p className={styles.statLabel}>From {partnerName}</p>
        </div>
      </div>
    </DashboardCard>
  );
}
