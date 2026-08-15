import { MapPinIcon, MoonIcon, SunIcon, UserIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import { LOCATIONS } from "../data/locations";
import { partnerName } from "../data/thread";
import { useSettings } from "../hooks/useSettings";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { userLocationId, partnerLocationId, theme, setUserLocationId, setPartnerLocationId, setTheme } =
    useSettings();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your locations and how Tether looks.</p>
      </header>

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.grid}>
          <DashboardCard icon={<UserIcon size={16} weight="fill" />} title="Your location">
            <select
              className={styles.select}
              value={userLocationId}
              onChange={(event) => setUserLocationId(event.target.value)}
            >
              {LOCATIONS.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city}, {location.country}
                </option>
              ))}
            </select>
          </DashboardCard>

          <DashboardCard icon={<MapPinIcon size={16} weight="fill" />} title={`${partnerName}'s location`}>
            <select
              className={styles.select}
              value={partnerLocationId}
              onChange={(event) => setPartnerLocationId(event.target.value)}
            >
              {LOCATIONS.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city}, {location.country}
                </option>
              ))}
            </select>
          </DashboardCard>

          <DashboardCard icon={<SunIcon size={16} weight="fill" />} title="Appearance">
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segment} ${theme === "light" ? styles.segmentActive : ""}`}
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
              >
                <SunIcon size={16} />
                Light
              </button>
              <button
                type="button"
                className={`${styles.segment} ${theme === "dark" ? styles.segmentActive : ""}`}
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
              >
                <MoonIcon size={16} />
                Dark
              </button>
            </div>
          </DashboardCard>
        </div>
      </main>
    </div>
  );
}
