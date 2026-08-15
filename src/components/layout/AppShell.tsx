import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import type { View } from "../../App";
import styles from "./AppShell.module.css";

interface AppShellProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

export function AppShell({ view, onNavigate, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <Sidebar view={view} onNavigate={onNavigate} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
