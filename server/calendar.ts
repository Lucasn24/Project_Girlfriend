import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ical, { type CalendarResponse, type VEvent } from "node-ical";

export type CalendarOwner = "user" | "partner";

export interface CalendarEvent {
  id: string;
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  source: "ical";
}

export interface CalendarStatus {
  configured: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

interface StoredConfig {
  user: { url: string | null };
  partner: { url: string | null };
}

interface CacheEntry {
  raw: CalendarResponse | null;
  lastSyncedAt: string | null;
  error: string | null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "data", "calendar-config.json");
const OWNERS: CalendarOwner[] = ["user", "partner"];
const POLL_INTERVAL_MS = 5 * 60 * 1000;

let config: StoredConfig = { user: { url: null }, partner: { url: null } };

const cache: Record<CalendarOwner, CacheEntry> = {
  user: { raw: null, lastSyncedAt: null, error: null },
  partner: { raw: null, lastSyncedAt: null, error: null },
};

async function loadCalendarConfig(): Promise<void> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    config = {
      user: { url: parsed?.user?.url ?? null },
      partner: { url: parsed?.partner?.url ?? null },
    };
  } catch {
    // no config saved yet
  }
}

async function saveCalendarConfig(): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function textValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in (value as Record<string, unknown>)) {
    return String((value as { val: unknown }).val);
  }
  return String(value);
}

/**
 * Date-only (VALUE=DATE) fields are timezone-free, but node-ical anchors them to
 * this process's local timezone when building a Date. Re-anchoring to UTC noon of
 * that same local calendar date keeps the instant on the intended day for every
 * realistic viewer timezone, instead of leaking this server's TZ into the result.
 */
function toNoonUtc(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)).toISOString();
}

async function syncCalendar(owner: CalendarOwner): Promise<void> {
  const url = config[owner].url;
  if (!url) {
    cache[owner] = { raw: null, lastSyncedAt: null, error: null };
    return;
  }
  try {
    const data = await ical.async.fromURL(url);
    cache[owner] = { raw: data, lastSyncedAt: new Date().toISOString(), error: null };
  } catch (error) {
    console.error(`[calendar] sync failed for ${owner}:`, error);
    cache[owner] = {
      raw: cache[owner].raw,
      lastSyncedAt: cache[owner].lastSyncedAt,
      error: error instanceof Error ? error.message : "Failed to fetch calendar",
    };
  }
}

export function getCalendarStatus(owner: CalendarOwner): CalendarStatus {
  const entry = cache[owner];
  return {
    configured: Boolean(config[owner].url),
    lastSyncedAt: entry.lastSyncedAt,
    error: entry.error,
  };
}

export function getAllCalendarStatuses(): Record<CalendarOwner, CalendarStatus> {
  return { user: getCalendarStatus("user"), partner: getCalendarStatus("partner") };
}

export async function setCalendarUrl(owner: CalendarOwner, url: string | null): Promise<CalendarStatus> {
  config[owner] = { url: url && url.trim() ? url.trim() : null };
  await saveCalendarConfig();
  await syncCalendar(owner);
  return getCalendarStatus(owner);
}

export function getEvents(start: Date, end: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const owner of OWNERS) {
    const raw = cache[owner].raw;
    if (!raw) continue;

    for (const [key, component] of Object.entries(raw)) {
      if (!component || typeof component !== "object" || (component as VEvent).type !== "VEVENT") continue;
      const event = component as VEvent;

      const instances = ical.expandRecurringEvent(event, { from: start, to: end, expandOngoing: true });
      for (const instance of instances) {
        events.push({
          id: `${owner}:${key}:${instance.start.toISOString()}`,
          owner,
          title: textValue(instance.summary) || "Untitled event",
          start: instance.isFullDay ? toNoonUtc(instance.start) : instance.start.toISOString(),
          end: instance.isFullDay ? toNoonUtc(instance.end) : instance.end.toISOString(),
          allDay: instance.isFullDay,
          location: event.location ? textValue(event.location) : undefined,
          source: "ical",
        });
      }
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return events;
}

export async function startCalendarSync(): Promise<void> {
  await loadCalendarConfig();

  await Promise.all(OWNERS.filter((owner) => config[owner].url).map(syncCalendar));

  setInterval(() => {
    for (const owner of OWNERS) {
      if (config[owner].url) void syncCalendar(owner);
    }
  }, POLL_INTERVAL_MS);
}
