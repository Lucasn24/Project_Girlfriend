import { addDays, getZonedParts, zonedYmdToUtc } from "./calendarRange";

/**
 * The photo timeline's "day" runs 7am–7am (local), not midnight–midnight, so a
 * late-night photo (e.g. 2am) is grouped with the evening before it.
 */
export const PHOTO_DAY_START_HOUR = 7;
export const PHOTO_DAY_DEFAULT_END_HOUR = 22;
export const PHOTO_DAY_DEFAULT_END_MIN = (PHOTO_DAY_DEFAULT_END_HOUR - PHOTO_DAY_START_HOUR) * 60;
export const PHOTO_DAY_MIN_SPAN_MIN = 120;

export function photoDayStart(cursor: Date, timeZone: string): Date {
  const { year, month, day } = getZonedParts(cursor, timeZone);
  return zonedYmdToUtc(year, month, day, PHOTO_DAY_START_HOUR, 0, 0, timeZone);
}

export function photoDayEndExclusive(cursor: Date, timeZone: string): Date {
  return addDays(photoDayStart(cursor, timeZone), 1, timeZone);
}

/** Minutes since this photo-day's 7am start, wrapped into [0, 1440). */
export function minutesSincePhotoDayStart(date: Date, timeZone: string): number {
  const { hour, minute, second } = getZonedParts(date, timeZone);
  let mins = hour * 60 + minute + second / 60 - PHOTO_DAY_START_HOUR * 60;
  if (mins < 0) mins += 1440;
  return mins;
}

/** Formats a minutes-since-7am value back into a wall-clock label, e.g. "12pm" or "12:07pm". */
export function formatMinutesSincePhotoDayStart(minute: number): string {
  const clockMin = Math.round((PHOTO_DAY_START_HOUR * 60 + minute) % 1440);
  const h24 = Math.floor(clockMin / 60);
  const m = clockMin % 60;
  const period = h24 < 12 ? "am" : "pm";
  const h12raw = h24 % 12;
  const h12 = h12raw === 0 ? 12 : h12raw;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}
