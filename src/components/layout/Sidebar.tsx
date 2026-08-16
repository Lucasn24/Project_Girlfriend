import { CalendarBlankIcon, ChatCircleIcon, GearIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { Avatar } from "../chatbot/Avatar";
import { partnerName } from "../../data/thread";
import type { View } from "../../App";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: { view: View; label: string; icon: typeof SquaresFourIcon }[] = [
  { view: "dashboard", label: "Dashboard", icon: SquaresFourIcon },
  { view: "chat", label: "Chat", icon: ChatCircleIcon },
  { view: "calendar", label: "Calendar", icon: CalendarBlankIcon },
];

const FOOTER_ITEMS: { view: View; label: string; icon: typeof GearIcon }[] = [
  { view: "settings", label: "Settings", icon: GearIcon },
];

export function Sidebar({ view, onNavigate }: SidebarProps) {
  const renderNavButton = ({
    view: itemView,
    label,
    icon: Icon,
  }: {
    view: View;
    label: string;
    icon: typeof SquaresFourIcon;
  }) => {
    const isActive = view === itemView;
    return (
      <button
        key={itemView}
        type="button"
        aria-label={label}
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
        onClick={() => onNavigate(itemView)}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon size={20} weight={isActive ? "fill" : "regular"} />
        <span className={styles.navLabel}>{label}</span>
      </button>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Avatar initial="L" aiActive />
        <div className={styles.brandText}>
          <span className={styles.brandName}>{partnerName}</span>
          <span className={styles.brandStatus}>
            <span className={styles.statusDot} aria-hidden="true" />
            AI companion active
          </span>
        </div>
      </div>

      <nav className={styles.nav}>{NAV_ITEMS.map(renderNavButton)}</nav>

      <div className={styles.footer}>{FOOTER_ITEMS.map(renderNavButton)}</div>
    </aside>
  );
}
