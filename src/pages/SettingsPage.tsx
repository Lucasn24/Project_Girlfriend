import { useState } from "react";
import { CalendarBlankIcon, MapPinIcon, MoonIcon, SunIcon, UserIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../components/dashboard/DashboardCard";
import { LOCATIONS } from "../data/locations";
import { partnerName } from "../data/thread";
import { useCalendarSync } from "../hooks/useCalendarSync";
import { useGoogleCalendarSync } from "../hooks/useGoogleCalendarSync";
import { useSettings } from "../hooks/useSettings";
import type { CalendarOwner, CalendarStatus } from "../types";
import styles from "./SettingsPage.module.css";

function formatLastSynced(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.round(hours / 24)}d ago`;
}

interface CalendarSyncFieldProps {
  owner: CalendarOwner;
  title: string;
  possessive: string;
  status: CalendarStatus;
  isSaving: boolean;
  onSave: (owner: CalendarOwner, url: string) => void;
  googleConfigured: boolean;
  googleConnected: boolean;
  isConnectingGoogle: boolean;
  onConnectGoogle: (owner: CalendarOwner) => void;
  onDisconnectGoogle: (owner: CalendarOwner) => void;
}

function CalendarSyncField({
  owner,
  title,
  possessive,
  status,
  isSaving,
  onSave,
  googleConfigured,
  googleConnected,
  isConnectingGoogle,
  onConnectGoogle,
  onDisconnectGoogle,
}: CalendarSyncFieldProps) {
  const [value, setValue] = useState("");

  const handleSave = () => {
    onSave(owner, value);
    setValue("");
  };

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

      {googleConnected ? (
        <p className={styles.helpText}>
          This calendar is synced via Google — the iCal link below is unused while connected.
        </p>
      ) : (
        <>
          <p className={styles.helpText}>
            Or, for one-way (read-only) import: in Google Calendar, go to Settings → {possessive} calendar → "Secret
            address in iCal format", copy it, and paste it below.
          </p>
          <div className={styles.calendarField}>
            <input
              type="text"
              className={styles.select}
              placeholder={status.configured ? "Connected — paste a new URL to replace it" : "Paste secret iCal URL"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || !value.trim()}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
          <div className={styles.calendarStatusRow}>
            <span
              className={`${styles.statusDot} ${status.configured ? styles.statusDotOk : ""}`}
              aria-hidden="true"
            />
            <span>
              {status.configured ? formatLastSynced(status.lastSyncedAt) : "Not connected"}
              {status.error ? ` · ${status.error}` : ""}
            </span>
            {status.configured && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onSave(owner, "")}
                disabled={isSaving}
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
    </DashboardCard>
  );
}

export function SettingsPage() {
  const { userLocationId, partnerLocationId, theme, setUserLocationId, setPartnerLocationId, setTheme } =
    useSettings();
  const { status, savingOwner, setCalendarUrl } = useCalendarSync();
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
            possessive="your"
            status={status.user}
            isSaving={savingOwner === "user"}
            onSave={setCalendarUrl}
            googleConfigured={googleStatus.configured}
            googleConnected={googleStatus.user.connected}
            isConnectingGoogle={connectingOwner === "user"}
            onConnectGoogle={connectGoogle}
            onDisconnectGoogle={disconnectGoogle}
          />

          <CalendarSyncField
            owner="partner"
            title={`${partnerName}'s calendar`}
            possessive={`${partnerName}'s`}
            status={status.partner}
            isSaving={savingOwner === "partner"}
            onSave={setCalendarUrl}
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
