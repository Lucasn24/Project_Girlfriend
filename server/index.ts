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

app.get("/api/calendar/events", (req, res) => {
  const startParam = req.query.start;
  const endParam = req.query.end;

  if (typeof startParam !== "string" || typeof endParam !== "string") {
    res.status(400).json({ error: "start and end query params are required" });
    return;
  }

  const start = new Date(startParam);
  const end = new Date(endParam);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    res.status(400).json({ error: "start and end must be valid dates" });
    return;
  }

  res.json({ events: getEvents(start, end) });
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

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

startCalendarSync().catch((error) => {
  console.error("[calendar] failed to start sync:", error);
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
