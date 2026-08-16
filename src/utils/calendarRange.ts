export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Reads the wall-clock date/time a UTC instant corresponds to in `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getPartsFormatter(timeZone).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  let hour = Number(lookup.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

/** Converts a wall-clock date/time in `timeZone` to the UTC instant it represents. */
export function zonedYmdToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const zonedAtGuess = getZonedParts(new Date(utcGuess), timeZone);
  const zonedGuessAsUtc = Date.UTC(
    zonedAtGuess.year,
    zonedAtGuess.month - 1,
    zonedAtGuess.day,
    zonedAtGuess.hour,
    zonedAtGuess.minute,
    zonedAtGuess.second,
  );
  const offsetMs = zonedGuessAsUtc - utcGuess;
  return new Date(utcGuess - offsetMs);
}

/** Stable per-day map key for `date`'s calendar day in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function startOfDay(date: Date, timeZone: string): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedYmdToUtc(year, month, day, 0, 0, 0, timeZone);
}

export function endOfDay(date: Date, timeZone: string): Date {
  return new Date(addDays(startOfDay(date, timeZone), 1, timeZone).getTime() - 1);
}

export function addDays(date: Date, days: number, timeZone: string): Date {
  const { year, month, day, hour, minute, second } = getZonedParts(date, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, hour, minute, second));
  return zonedYmdToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
    timeZone,
  );
}

export function addMonths(date: Date, months: number, timeZone: string): Date {
  const { year, month, day, hour, minute, second } = getZonedParts(date, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day, hour, minute, second));
  return zonedYmdToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
    timeZone,
  );
}

export function getZonedWeekday(date: Date, timeZone: string): number {
  const { year, month, day } = getZonedParts(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

export function startOfWeek(date: Date, timeZone: string): Date {
  return addDays(startOfDay(date, timeZone), -getZonedWeekday(date, timeZone), timeZone);
}

export function endOfWeek(date: Date, timeZone: string): Date {
  return endOfDay(addDays(startOfWeek(date, timeZone), 6, timeZone), timeZone);
}

export function startOfMonth(date: Date, timeZone: string): Date {
  const { year, month } = getZonedParts(date, timeZone);
  return zonedYmdToUtc(year, month, 1, 0, 0, 0, timeZone);
}

export function endOfMonth(date: Date, timeZone: string): Date {
  const { year, month } = getZonedParts(date, timeZone);
  const nextMonthStart = zonedYmdToUtc(year, month + 1, 1, 0, 0, 0, timeZone);
  return new Date(nextMonthStart.getTime() - 1);
}

export function isSameDay(a: Date, b: Date, timeZone: string): boolean {
  return dayKey(a, timeZone) === dayKey(b, timeZone);
}

export function isSameMonth(a: Date, b: Date, timeZone: string): boolean {
  const pa = getZonedParts(a, timeZone);
  const pb = getZonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month;
}

/** Minutes since local midnight in `timeZone`, including fractional seconds. */
export function minutesOfDay(date: Date, timeZone: string): number {
  const { hour, minute, second } = getZonedParts(date, timeZone);
  return hour * 60 + minute + second / 60;
}
