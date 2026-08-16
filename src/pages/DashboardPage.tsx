import { useState } from "react";
import { ConnectionCard } from "../components/dashboard/ConnectionCard";
import { GetConversationCard } from "../components/dashboard/GetConversationCard";
import { TodayAgendaCard } from "../components/dashboard/TodayAgendaCard";
import { useDashboardLayout, type DashboardCardId } from "../hooks/useDashboardLayout";
import styles from "./DashboardPage.module.css";

function renderCard(id: DashboardCardId) {
  switch (id) {
    case "conversation":
      return <GetConversationCard />;
    case "connection":
      return <ConnectionCard />;
    case "agenda":
      return <TodayAgendaCard />;
  }
}

export function DashboardPage() {
  const { order, moveCard } = useDashboardLayout();
  const [draggedId, setDraggedId] = useState<DashboardCardId | null>(null);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Your relationship, at a glance.</p>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.grid}>
          {order.map((id) => (
            <div
              key={id}
              className={`${styles.dragItem} ${draggedId === id ? styles.dragging : ""}`}
              draggable
              onDragStart={() => setDraggedId(id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedId && draggedId !== id) moveCard(draggedId, id);
              }}
            >
              {renderCard(id)}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
