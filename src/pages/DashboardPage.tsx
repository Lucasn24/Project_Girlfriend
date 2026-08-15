import { ConnectionCard } from "../components/dashboard/ConnectionCard";
import { StatsCard } from "../components/dashboard/StatsCard";
import type { ThreadItem } from "../types";
import styles from "./DashboardPage.module.css";

interface DashboardPageProps {
  items: ThreadItem[];
}

export function DashboardPage({ items }: DashboardPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Your relationship, at a glance.</p>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.grid}>
          <ConnectionCard />
          <StatsCard items={items} />
        </div>
      </main>
    </div>
  );
}
