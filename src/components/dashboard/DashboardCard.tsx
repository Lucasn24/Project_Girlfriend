import type { ReactNode } from "react";
import styles from "./DashboardCard.module.css";

interface DashboardCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export function DashboardCard({ icon, title, children }: DashboardCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span className={styles.iconWrap} aria-hidden="true">
          {icon}
        </span>
        <h2 className={styles.title}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
