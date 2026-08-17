import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CalendarOwner } from "./calendar.js";

export interface LocalCalendarEvent {
  id: string;
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  source: "local";
}

export interface LocalEventInput {
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

export type LocalEventPatch = Partial<LocalEventInput>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "data", "calendar-events.json");

async function readAll(): Promise<LocalCalendarEvent[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(events: LocalCalendarEvent[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  // Write-then-rename so a crash or dev-server restart mid-write can never leave
  // the real file truncated — the rename is the only step that touches it.
  const tmpPath = `${DATA_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(events, null, 2));
  await fs.rename(tmpPath, DATA_PATH);
}

export async function getLocalEvents(start: Date, end: Date): Promise<LocalCalendarEvent[]> {
  const all = await readAll();
  return all.filter((event) => new Date(event.end) >= start && new Date(event.start) <= end);
}

export async function createLocalEvent(input: LocalEventInput): Promise<LocalCalendarEvent> {
  const event: LocalCalendarEvent = {
    id: `local:${randomUUID()}`,
    owner: input.owner,
    title: input.title,
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    location: input.location,
    source: "local",
  };

  const all = await readAll();
  all.push(event);
  await writeAll(all);
  return event;
}

export async function updateLocalEvent(id: string, patch: LocalEventPatch): Promise<LocalCalendarEvent | null> {
  const all = await readAll();
  const index = all.findIndex((event) => event.id === id);
  if (index === -1) return null;

  const updated: LocalCalendarEvent = { ...all[index], ...patch };
  all[index] = updated;
  await writeAll(all);
  return updated;
}

export async function deleteLocalEvent(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((event) => event.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}
