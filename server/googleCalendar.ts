import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google, type calendar_v3 } from "googleapis";
import type { Credentials, OAuth2Client } from "google-auth-library";

export type CalendarOwner = "user" | "partner";

export interface GoogleCalendarEvent {
  id: string;
  owner: CalendarOwner;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  source: "google";
}

export interface GoogleEventInput {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  timeZone: string;
}

export interface GoogleEventPatch {
  title?: string;
  location?: string;
  /** When set, start/end/allDay/timeZone must all be provided together. */
  dates?: { start: string; end: string; allDay: boolean; timeZone: string };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.join(__dirname, "data", "google-calendar-tokens.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

type TokenStore = Partial<Record<CalendarOwner, Credentials>>;

let tokenCache: TokenStore | null = null;

async function readTokens(): Promise<TokenStore> {
  if (tokenCache) return tokenCache;
  try {
    const raw = await fs.readFile(TOKENS_PATH, "utf-8");
    tokenCache = JSON.parse(raw);
  } catch {
    tokenCache = {};
  }
  return tokenCache!;
}

async function writeTokens(store: TokenStore): Promise<void> {
  tokenCache = store;
  await fs.mkdir(path.dirname(TOKENS_PATH), { recursive: true });
  // Write-then-rename so a crash or dev-server restart mid-write can never leave
  // stored refresh tokens truncated, forcing a reconnect.
  const tmpPath = `${TOKENS_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2));
  await fs.rename(tmpPath, TOKENS_PATH);
}

function getEnv(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleConfigured(): boolean {
  return getEnv() !== null;
}

function createOAuthClient(): OAuth2Client {
  const env = getEnv();
  if (!env) {
    throw new Error("Google Calendar isn't configured on the server (missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)");
  }
  return new google.auth.OAuth2(env.clientId, env.clientSecret, env.redirectUri);
}

export function getAuthUrl(owner: CalendarOwner): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: owner,
  });
}

export async function handleOAuthCallback(owner: CalendarOwner, code: string): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  const store = await readTokens();
  store[owner] = tokens;
  await writeTokens(store);
}

export async function getConnectionStatuses(): Promise<Record<CalendarOwner, { connected: boolean }>> {
  const store = await readTokens();
  return {
    user: { connected: Boolean(store.user?.refresh_token) },
    partner: { connected: Boolean(store.partner?.refresh_token) },
  };
}

export async function disconnectGoogle(owner: CalendarOwner): Promise<void> {
  const store = await readTokens();
  delete store[owner];
  await writeTokens(store);
}

async function getAuthorizedClient(owner: CalendarOwner): Promise<OAuth2Client | null> {
  const store = await readTokens();
  const stored = store[owner];
  if (!stored?.refresh_token) return null;

  const client = createOAuthClient();
  client.setCredentials(stored);
  // Persist rotated access/refresh tokens so future calls don't need a fresh consent.
  client.on("tokens", (tokens) => {
    void (async () => {
      const latest = await readTokens();
      latest[owner] = { ...latest[owner], ...tokens };
      await writeTokens(latest);
    })();
  });
  return client;
}

function zonedDateString(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

/**
 * All-day (date-only) Google events carry no time zone. Anchoring to UTC noon of
 * that calendar date keeps the instant on the intended day for any realistic
 * viewer time zone when it's read back, mirroring calendar.ts's ICS handling.
 */
function toNoonUtc(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

function toCalendarEvent(owner: CalendarOwner, item: calendar_v3.Schema$Event): GoogleCalendarEvent | null {
  if (!item.id) return null;
  const allDay = Boolean(item.start?.date);
  const startRaw = allDay ? item.start?.date : item.start?.dateTime;
  const endRaw = allDay ? item.end?.date : item.end?.dateTime;
  if (!startRaw || !endRaw) return null;

  return {
    id: `google:${owner}:${item.id}`,
    owner,
    title: item.summary?.trim() || "Untitled event",
    start: allDay ? toNoonUtc(startRaw) : new Date(startRaw).toISOString(),
    end: allDay ? toNoonUtc(endRaw) : new Date(endRaw).toISOString(),
    allDay,
    location: item.location || undefined,
    source: "google",
  };
}

function toGoogleEventBody(input: GoogleEventInput): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = { summary: input.title, location: input.location || null };
  if (input.allDay) {
    body.start = { date: zonedDateString(input.start, input.timeZone) };
    body.end = { date: zonedDateString(input.end, input.timeZone) };
  } else {
    body.start = { dateTime: input.start };
    body.end = { dateTime: input.end };
  }
  return body;
}

function toGooglePatchBody(patch: GoogleEventPatch): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {};
  if (patch.title !== undefined) body.summary = patch.title;
  if (patch.location !== undefined) body.location = patch.location || null;
  if (patch.dates) {
    const { start, end, allDay, timeZone } = patch.dates;
    body.start = allDay ? { date: zonedDateString(start, timeZone) } : { dateTime: start };
    body.end = allDay ? { date: zonedDateString(end, timeZone) } : { dateTime: end };
  }
  return body;
}

export function parseGoogleEventId(id: string): { owner: CalendarOwner; googleEventId: string } | null {
  const match = /^google:(user|partner):(.+)$/.exec(id);
  if (!match) return null;
  return { owner: match[1] as CalendarOwner, googleEventId: match[2] };
}

function isNotFoundError(error: unknown): boolean {
  const status =
    (error as { code?: number }).code ?? (error as { response?: { status?: number } }).response?.status;
  return status === 404 || status === 410;
}

export async function listGoogleEvents(owner: CalendarOwner, start: Date, end: Date): Promise<GoogleCalendarEvent[]> {
  const client = await getAuthorizedClient(owner);
  if (!client) return [];

  const calendar = google.calendar({ version: "v3", auth: client });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  const events: GoogleCalendarEvent[] = [];
  for (const item of res.data.items ?? []) {
    if (item.status === "cancelled") continue;
    const mapped = toCalendarEvent(owner, item);
    if (mapped) events.push(mapped);
  }
  return events;
}

export async function createGoogleEvent(owner: CalendarOwner, input: GoogleEventInput): Promise<GoogleCalendarEvent> {
  const client = await getAuthorizedClient(owner);
  if (!client) throw new Error("Google Calendar isn't connected for this owner");

  const calendar = google.calendar({ version: "v3", auth: client });
  const res = await calendar.events.insert({ calendarId: "primary", requestBody: toGoogleEventBody(input) });
  const mapped = toCalendarEvent(owner, res.data);
  if (!mapped) throw new Error("Google Calendar returned an invalid event");
  return mapped;
}

export async function updateGoogleEvent(
  owner: CalendarOwner,
  googleEventId: string,
  patch: GoogleEventPatch,
): Promise<GoogleCalendarEvent | null> {
  const client = await getAuthorizedClient(owner);
  if (!client) return null;

  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    const res = await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: toGooglePatchBody(patch),
    });
    return toCalendarEvent(owner, res.data);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export async function deleteGoogleEvent(owner: CalendarOwner, googleEventId: string): Promise<boolean> {
  const client = await getAuthorizedClient(owner);
  if (!client) return false;

  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}
