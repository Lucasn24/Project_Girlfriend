import { getLocation, type Location } from "../../data/locations";
import { haversineKm } from "../../utils/geo";
import { useNow } from "./useNow";
import { useSettings } from "../settings/useSettings";

const SLEEP_START_HOUR = 23;
const SLEEP_END_HOUR = 7;

function formatTime(date: Date, timeZone: string): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

function hourIn(date: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(date),
  ) % 24;
}

function hoursAheadOf(date: Date, timeZone: string, baseTimeZone: string): number {
  let diff = hourIn(date, timeZone) - hourIn(date, baseTimeZone);
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  return diff;
}

export interface ConnectionInfo {
  now: Date;
  userLocation: Location;
  partnerLocation: Location;
  userTime: string;
  partnerTime: string;
  hoursDiff: number;
  diffLabel: string;
  distanceKm: number;
  partnerIsAsleep: boolean;
  partnerWakeLabel: string;
}

export function useConnection(): ConnectionInfo {
  const now = useNow();
  const { userLocationId, partnerLocationId } = useSettings();
  const userLocation = getLocation(userLocationId);
  const partnerLocation = getLocation(partnerLocationId);

  const hoursDiff = hoursAheadOf(now, partnerLocation.timeZone, userLocation.timeZone);
  const diffLabel =
    hoursDiff === 0 ? "Same time as you" : `${Math.abs(hoursDiff)}h ${hoursDiff > 0 ? "ahead" : "behind"}`;
  const distanceKm = Math.round(haversineKm(userLocation, partnerLocation));

  const partnerHour = hourIn(now, partnerLocation.timeZone);
  const partnerIsAsleep = partnerHour >= SLEEP_START_HOUR || partnerHour < SLEEP_END_HOUR;

  return {
    now,
    userLocation,
    partnerLocation,
    userTime: formatTime(now, userLocation.timeZone),
    partnerTime: formatTime(now, partnerLocation.timeZone),
    hoursDiff,
    diffLabel,
    distanceKm,
    partnerIsAsleep,
    partnerWakeLabel: `${SLEEP_END_HOUR}:00 AM`,
  };
}
