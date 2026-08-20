import { CalendarBlankIcon, MapPinIcon, MoonIcon, SunIcon, UserIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import { LOCATIONS } from "../data/locations";
import { partnerName } from "../data/thread";
import { useGoogleCalendarSync } from "../hooks/calendar/useGoogleCalendarSync";
import { useSettings } from "../hooks/settings/useSettings";
import type { CalendarOwner } from "../types";
import styles from "./SettingsPage.module.css";

interface CalendarSyncFieldProps {
  owner: CalendarOwner;
  title: string;
  googleConfigured: boolean;
  googleConnected: boolean;
  isConnectingGoogle: boolean;
  onConnectGoogle: (owner: CalendarOwner) => void;
  onDisconnectGoogle: (owner: CalendarOwner) => void;
}

function CalendarSyncField({
  owner,
  title,
  googleConfigured,
  googleConnected,
  isConnectingGoogle,
  onConnectGoogle,
  onDisconnectGoogle,
}: CalendarSyncFieldProps) {
  return (
    <DashboardCard icon={<CalendarBlankIcon size={16} weight="fill" />} title={title}>
      <div className={styles.googleSyncRow}>
        <div>
          <p className={styles.helpText} style={{ margin: 0 }}>
            {googleConnected
              ? "Connected — events you add, edit, or drag here push straight to this Google Calendar, and its events show up here too."
              : "Connect for two-way sync: create, edit, and drag events here and they'll appear on the real calendar."}
          </p>
        </div>
        <button
          type="button"
          className={googleConnected ? styles.removeButton : styles.saveButton}
          onClick={() => (googleConnected ? onDisconnectGoogle(owner) : onConnectGoogle(owner))}
          disabled={!googleConfigured || isConnectingGoogle}
        >
          {isConnectingGoogle ? "Connecting…" : googleConnected ? "Disconnect" : "Connect Google Calendar"}
        </button>
      </div>
      {!googleConfigured && (
        <p className={styles.helpText}>
          Google Calendar isn't configured on the server yet — add GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI to .env.
        </p>
      )}
    </DashboardCard>
  );
}

export function SettingsPage() {
  const { userLocationId, partnerLocationId, theme, setUserLocationId, setPartnerLocationId, setTheme } =
    useSettings();
  const { status: googleStatus, connectingOwner, connect: connectGoogle, disconnect: disconnectGoogle } =
    useGoogleCalendarSync();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your locations, calendar sync, and how Tether looks.</p>
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

          <CalendarSyncField
            owner="user"
            title="Your calendar"
            googleConfigured={googleStatus.configured}
            googleConnected={googleStatus.user.connected}
            isConnectingGoogle={connectingOwner === "user"}
            onConnectGoogle={connectGoogle}
            onDisconnectGoogle={disconnectGoogle}
          />

          <CalendarSyncField
            owner="partner"
            title={`${partnerName}'s calendar`}
            googleConfigured={googleStatus.configured}
            googleConnected={googleStatus.partner.connected}
            isConnectingGoogle={connectingOwner === "partner"}
            onConnectGoogle={connectGoogle}
            onDisconnectGoogle={disconnectGoogle}
          />
        </div>
      </main>
    </div>
  );
}
