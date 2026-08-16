import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import styles from "./DashboardCard.module.css";

interface DashboardCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  draggable?: boolean;
}

export function DashboardCard({ icon, title, children, draggable }: DashboardCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span className={styles.iconWrap} aria-hidden="true">
          {icon}
        </span>
        <h2 className={styles.title}>{title}</h2>
        {draggable && (
          <DotsSixVerticalIcon size={16} weight="bold" className={styles.dragHandle} aria-hidden="true" />
        )}
      </div>
      {children}
    </section>
  );
}
