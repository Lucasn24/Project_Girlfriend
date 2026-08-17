import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamReply, type HistoryTurn } from "./gemini.js";
import { generateCouplePhoto, getCouplePhotoState } from "./couplePhoto.js";
import {
  getAllCalendarStatuses,
  getEvents,
  setCalendarUrl,
  startCalendarSync,
  type CalendarOwner,
} from "./calendar.js";
import {
  createLocalEvent,
  deleteLocalEvent,
  getLocalEvents,
  updateLocalEvent,
  type LocalEventPatch,
} from "./localEvents.js";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  disconnectGoogle,
  getAuthUrl,
  getConnectionStatuses,
  handleOAuthCallback,
  isGoogleConfigured,
  listGoogleEvents,
  parseGoogleEventId,
  updateGoogleEvent,
  type GoogleEventPatch,
} from "./googleCalendar.js";
import { addGame, deleteGame, getGames, type GameOwner } from "./games.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
// 20mb to fit base64-encoded full-body photos for the couple-photo feature.
app.use(express.json({ limit: "20mb" }));
app.use("/couple-photo-images", express.static(path.join(__dirname, "data", "couple-photo")));

app.post("/api/chat", async (req, res) => {
  const start = performance.now();
  const history = req.body?.history as HistoryTurn[] | undefined;

  if (!Array.isArray(history) || history.length === 0) {
    res.status(400).json({ error: "history must be a non-empty array" });
    return;
  }

  console.log(`[chat] request received (${history.length} turns)`);

  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  try {
    let sentAny = false;
    for await (const chunk of streamReply(history)) {
      sentAny = true;
      res.write(chunk);
    }
    if (!sentAny) {
      throw new Error("Gemini returned an empty response");
    }
    console.log(`[chat] request completed in ${(performance.now() - start).toFixed(0)}ms`);
    res.end();
  } catch (error) {
    console.error(`[chat] request failed after ${(performance.now() - start).toFixed(0)}ms:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to generate a reply",
      });
    } else {
      res.end();
    }
  }
});

function isOwner(value: unknown): value is CalendarOwner {
  return value === "user" || value === "partner";
}

app.get("/api/calendar/status", (_req, res) => {
  res.json(getAllCalendarStatuses());
});

app.put("/api/calendar/config/:owner", async (req, res) => {
  const { owner } = req.params;
  if (!isOwner(owner)) {
    res.status(400).json({ error: "owner must be 'user' or 'partner'" });
    return;
  }

  const url = req.body?.url;
  if (url !== null && typeof url !== "string") {
    res.status(400).json({ error: "url must be a string or null" });
    return;
  }

  try {
    const status = await setCalendarUrl(owner, url);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save calendar" });
  }
});

function parseRangeParams(req: express.Request): { start: Date; end: Date } | null {
  const startParam = req.query.start;
  const endParam = req.query.end;
  if (typeof startParam !== "string" || typeof endParam !== "string") return null;

  const start = new Date(startParam);
  const end = new Date(endParam);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return { start, end };
}

const OWNERS: CalendarOwner[] = ["user", "partner"];

app.get("/api/calendar/events", async (req, res) => {
  const range = parseRangeParams(req);
  if (!range) {
    res.status(400).json({ error: "start and end query params must be valid dates" });
    return;
  }

  try {
    const [icalEventsRaw, localEvents, googleStatuses] = await Promise.all([
      getEvents(range.start, range.end),
      getLocalEvents(range.start, range.end),
      getConnectionStatuses(),
    ]);

    const googleConnectedOwners = OWNERS.filter((owner) => googleStatuses[owner].connected);
    // A Google-connected owner's events come from the live API; drop their cached
    // ICS import so the same event doesn't show up twice.
    const icalEvents = icalEventsRaw.filter((event) => !googleConnectedOwners.includes(event.owner));
    const googleEventLists = await Promise.all(
      googleConnectedOwners.map((owner) => listGoogleEvents(owner, range.start, range.end)),
    );

    const events = [...icalEvents, ...googleEventLists.flat(), ...localEvents].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load calendar events" });
  }
});

function parseEventInput(
  body: unknown,
):
  | { owner: CalendarOwner; title: string; start: string; end: string; allDay: boolean; location?: string; timeZone?: string }
  | { error: string } {
  const { owner, title, start, end, allDay, location, timeZone } = (body ?? {}) as Record<string, unknown>;

  if (!isOwner(owner)) return { error: "owner must be 'user' or 'partner'" };
  if (typeof title !== "string" || !title.trim()) return { error: "title must be a non-empty string" };
  if (typeof start !== "string" || Number.isNaN(new Date(start).getTime())) {
    return { error: "start must be a valid ISO date string" };
  }
  if (typeof end !== "string" || Number.isNaN(new Date(end).getTime())) {
    return { error: "end must be a valid ISO date string" };
  }
  if (new Date(end).getTime() < new Date(start).getTime()) return { error: "end must not be before start" };
  if (typeof allDay !== "boolean") return { error: "allDay must be a boolean" };
  if (location !== undefined && typeof location !== "string") return { error: "location must be a string" };
  if (timeZone !== undefined && typeof timeZone !== "string") return { error: "timeZone must be a string" };

  return {
    owner,
    title: title.trim(),
    start,
    end,
    allDay,
    location: location?.trim() || undefined,
    timeZone: timeZone || undefined,
  };
}

app.post("/api/calendar/events", async (req, res) => {
  const parsed = parseEventInput(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const googleStatus = await getConnectionStatuses();
    if (googleStatus[parsed.owner].connected) {
      if (!parsed.timeZone) {
        res.status(400).json({ error: "timeZone is required to create a Google Calendar event" });
        return;
      }
      const event = await createGoogleEvent(parsed.owner, {
        title: parsed.title,
        start: parsed.start,
        end: parsed.end,
        allDay: parsed.allDay,
        location: parsed.location,
        timeZone: parsed.timeZone,
      });
      res.status(201).json(event);
      return;
    }

    const event = await createLocalEvent(parsed);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create calendar event" });
  }
});

app.put("/api/calendar/events/:id", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const googleRef = parseGoogleEventId(req.params.id);

  if (googleRef) {
    const googlePatch: GoogleEventPatch = {};

    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        res.status(400).json({ error: "title must be a non-empty string" });
        return;
      }
      googlePatch.title = body.title.trim();
    }
    if ("location" in body) {
      if (body.location !== null && typeof body.location !== "string") {
        res.status(400).json({ error: "location must be a string or null" });
        return;
      }
      googlePatch.location = body.location ? body.location.trim() : undefined;
    }
    if ("start" in body || "end" in body || "allDay" in body) {
      const { start, end, allDay, timeZone } = body;
      if (
        typeof start !== "string" ||
        Number.isNaN(new Date(start).getTime()) ||
        typeof end !== "string" ||
        Number.isNaN(new Date(end).getTime()) ||
        typeof allDay !== "boolean" ||
        typeof timeZone !== "string" ||
        !timeZone
      ) {
        res.status(400).json({
          error: "updating dates on a Google-synced event requires start, end, allDay, and timeZone together",
        });
        return;
      }
      if (new Date(end).getTime() < new Date(start).getTime()) {
        res.status(400).json({ error: "end must not be before start" });
        return;
      }
      googlePatch.dates = { start, end, allDay, timeZone };
    }

    try {
      const updated = await updateGoogleEvent(googleRef.owner, googleRef.googleEventId, googlePatch);
      if (!updated) {
        res.status(404).json({ error: "Calendar event not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update calendar event" });
    }
    return;
  }

  const patch: LocalEventPatch = {};

  if ("owner" in body) {
    if (!isOwner(body.owner)) {
      res.status(400).json({ error: "owner must be 'user' or 'partner'" });
      return;
    }
    patch.owner = body.owner;
  }
  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      res.status(400).json({ error: "title must be a non-empty string" });
      return;
    }
    patch.title = body.title.trim();
  }
  if ("start" in body) {
    if (typeof body.start !== "string" || Number.isNaN(new Date(body.start).getTime())) {
      res.status(400).json({ error: "start must be a valid ISO date string" });
      return;
    }
    patch.start = body.start;
  }
  if ("end" in body) {
    if (typeof body.end !== "string" || Number.isNaN(new Date(body.end).getTime())) {
      res.status(400).json({ error: "end must be a valid ISO date string" });
      return;
    }
    patch.end = body.end;
  }
  if ("allDay" in body) {
    if (typeof body.allDay !== "boolean") {
      res.status(400).json({ error: "allDay must be a boolean" });
      return;
    }
    patch.allDay = body.allDay;
  }
  if ("location" in body) {
    if (body.location !== null && typeof body.location !== "string") {
      res.status(400).json({ error: "location must be a string or null" });
      return;
    }
    patch.location = body.location ? body.location.trim() || undefined : undefined;
  }

  try {
    const updated = await updateLocalEvent(req.params.id, patch);
    if (!updated) {
      res.status(404).json({ error: "Calendar event not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update calendar event" });
  }
});

app.delete("/api/calendar/events/:id", async (req, res) => {
  const googleRef = parseGoogleEventId(req.params.id);

  try {
    const removed = googleRef
      ? await deleteGoogleEvent(googleRef.owner, googleRef.googleEventId)
      : await deleteLocalEvent(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Calendar event not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete calendar event" });
  }
});

app.get("/api/calendar/google/status", async (_req, res) => {
  try {
    res.json({ configured: isGoogleConfigured(), ...(await getConnectionStatuses()) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load Google Calendar status" });
  }
});

app.get("/api/calendar/google/auth-url", (req, res) => {
  const { owner } = req.query;
  if (!isOwner(owner)) {
    res.status(400).json({ error: "owner must be 'user' or 'partner'" });
    return;
  }
  if (!isGoogleConfigured()) {
    res.status(400).json({ error: "Google Calendar isn't configured on the server yet" });
    return;
  }

  try {
    res.json({ url: getAuthUrl(owner) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to build Google auth URL" });
  }
});

function sendGoogleCallbackPage(res: express.Response, message: string): void {
  res.type("html").send(`<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Google Calendar</title></head>
  <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
    <p>${message}</p>
    <p>You can close this tab and return to Tether.</p>
    <script>window.close();</script>
  </body>
</html>`);
}

app.get("/api/calendar/google/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    sendGoogleCallbackPage(res, `Google Calendar connection was cancelled (${String(oauthError)}).`);
    return;
  }
  if (!isOwner(state) || typeof code !== "string" || !code) {
    sendGoogleCallbackPage(res, "Something went wrong — missing or invalid authorization response.");
    return;
  }

  try {
    await handleOAuthCallback(state, code);
    sendGoogleCallbackPage(res, "Google Calendar connected!");
  } catch (error) {
    console.error("[calendar] google oauth callback failed:", error);
    sendGoogleCallbackPage(res, "Failed to connect Google Calendar. Please try again.");
  }
});

app.post("/api/calendar/google/disconnect/:owner", async (req, res) => {
  const { owner } = req.params;
  if (!isOwner(owner)) {
    res.status(400).json({ error: "owner must be 'user' or 'partner'" });
    return;
  }

  try {
    await disconnectGoogle(owner);
    res.json({ connected: false });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to disconnect Google Calendar" });
  }
});

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseImagePayload(value: unknown): { data: Buffer; mimeType: string } | null {
  if (!value || typeof value !== "object") return null;
  const { data, mimeType } = value as { data?: unknown; mimeType?: unknown };
  if (typeof data !== "string" || typeof mimeType !== "string" || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return null;
  }
  try {
    return { data: Buffer.from(data, "base64"), mimeType };
  } catch {
    return null;
  }
}

app.get("/api/couple-photo", async (_req, res) => {
  try {
    res.json(await getCouplePhotoState());
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load couple photo" });
  }
});

app.post("/api/couple-photo/generate", async (req, res) => {
  const start = performance.now();
  const userImage = parseImagePayload(req.body?.userImage);
  const partnerImage = parseImagePayload(req.body?.partnerImage);

  if (!userImage || !partnerImage) {
    res.status(400).json({
      error: "userImage and partnerImage must each include a base64 data string and a jpeg/png/webp mimeType",
    });
    return;
  }

  console.log("[couple-photo] generation requested");

  try {
    const styleNote =
      typeof req.body?.styleNote === "string" && req.body.styleNote.trim()
        ? req.body.styleNote.trim().slice(0, 300)
        : undefined;
    const state = await generateCouplePhoto(userImage, partnerImage, styleNote);
    console.log(`[couple-photo] generated in ${(performance.now() - start).toFixed(0)}ms`);
    res.json(state);
  } catch (error) {
    console.error(`[couple-photo] generation failed after ${(performance.now() - start).toFixed(0)}ms:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate couple photo" });
  }
});

function isGameOwner(value: unknown): value is GameOwner {
  return value === "user" || value === "partner";
}

app.get("/api/games", async (_req, res) => {
  try {
    res.json({ results: await getGames() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load game results" });
  }
});

app.post("/api/games", async (req, res) => {
  const owner = req.body?.owner;
  const rawText = req.body?.rawText;

  if (!isGameOwner(owner)) {
    res.status(400).json({ error: "owner must be 'user' or 'partner'" });
    return;
  }
  if (typeof rawText !== "string" || !rawText.trim()) {
    res.status(400).json({ error: "rawText must be a non-empty string" });
    return;
  }

  try {
    const result = await addGame(owner, rawText);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to add game result" });
  }
});

app.delete("/api/games/:id", async (req, res) => {
  try {
    const removed = await deleteGame(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Game result not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete game result" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

startCalendarSync().catch((error) => {
  console.error("[calendar] failed to start sync:", error);
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
