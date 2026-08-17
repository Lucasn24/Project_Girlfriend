import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export type PhotoTimelineOwner = "user" | "partner";

export interface PhotoTimelineEntry {
  id: string;
  owner: PhotoTimelineOwner;
  timestamp: string;
  caption?: string;
  originalFile: string;
  thumbFile: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface PhotoTimelineApiEntry extends PhotoTimelineEntry {
  thumbUrl: string;
  originalUrl: string;
}

export interface PhotoTimelineCreateInput {
  owner: PhotoTimelineOwner;
  timestamp: string;
  caption?: string;
  buffer: Buffer;
  mimeType: string;
}

export type PhotoTimelinePatch = Partial<Pick<PhotoTimelineEntry, "timestamp" | "caption">>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data", "photo-timeline");
const ORIGINALS_DIR = path.join(DATA_DIR, "originals");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
const DATA_PATH = path.join(__dirname, "data", "photo-timeline.json");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_PHOTO_MIME_TYPES = new Set(Object.keys(EXT_BY_MIME));

function extFor(mimeType: string): string {
  return EXT_BY_MIME[mimeType] || "jpg";
}

async function readAll(): Promise<PhotoTimelineEntry[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: PhotoTimelineEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  // Write-then-rename so a crash or dev-server restart mid-write can never leave
  // the real file truncated — the rename is the only step that touches it.
  const tmpPath = `${DATA_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(entries, null, 2));
  await fs.rename(tmpPath, DATA_PATH);
}

function toApiEntry(entry: PhotoTimelineEntry): PhotoTimelineApiEntry {
  return {
    ...entry,
    thumbUrl: `/photo-timeline-images/thumbs/${entry.thumbFile}`,
    originalUrl: `/photo-timeline-images/originals/${entry.originalFile}`,
  };
}

export async function getPhotosInRange(start: Date, end: Date): Promise<PhotoTimelineApiEntry[]> {
  const all = await readAll();
  return all
    .filter((entry) => {
      const t = new Date(entry.timestamp).getTime();
      return t >= start.getTime() && t <= end.getTime();
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map(toApiEntry);
}

export async function createPhoto(input: PhotoTimelineCreateInput): Promise<PhotoTimelineApiEntry> {
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });
  await fs.mkdir(THUMBS_DIR, { recursive: true });

  const id = randomUUID();
  const ext = extFor(input.mimeType);
  const originalFile = `${id}.${ext}`;
  const thumbFile = `${id}.jpg`;

  const metadata = await sharp(input.buffer).metadata();
  await sharp(input.buffer)
    .resize({ width: 360, height: 360, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(path.join(THUMBS_DIR, thumbFile));
  await fs.writeFile(path.join(ORIGINALS_DIR, originalFile), input.buffer);

  const entry: PhotoTimelineEntry = {
    id,
    owner: input.owner,
    timestamp: input.timestamp,
    caption: input.caption,
    originalFile,
    thumbFile,
    mimeType: input.mimeType,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    createdAt: new Date().toISOString(),
  };

  const all = await readAll();
  all.push(entry);
  await writeAll(all);
  return toApiEntry(entry);
}

export async function updatePhoto(id: string, patch: PhotoTimelinePatch): Promise<PhotoTimelineApiEntry | null> {
  const all = await readAll();
  const index = all.findIndex((entry) => entry.id === id);
  if (index === -1) return null;

  const updated: PhotoTimelineEntry = { ...all[index], ...patch };
  all[index] = updated;
  await writeAll(all);
  return toApiEntry(updated);
}

export async function deletePhoto(id: string): Promise<boolean> {
  const all = await readAll();
  const index = all.findIndex((entry) => entry.id === id);
  if (index === -1) return false;

  const [entry] = all.splice(index, 1);
  await writeAll(all);
  await fs.rm(path.join(ORIGINALS_DIR, entry.originalFile), { force: true });
  await fs.rm(path.join(THUMBS_DIR, entry.thumbFile), { force: true });
  return true;
}

export async function getEntryById(id: string): Promise<PhotoTimelineEntry | null> {
  const all = await readAll();
  return all.find((entry) => entry.id === id) ?? null;
}

export function originalFilePath(entry: PhotoTimelineEntry): string {
  return path.join(ORIGINALS_DIR, entry.originalFile);
}
