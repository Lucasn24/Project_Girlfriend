import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCoupleImage, type ImageInput } from "./fluxKontext.js";

export interface CouplePhotoState {
  userPhotoUrl: string | null;
  partnerPhotoUrl: string | null;
  generatedUrl: string | null;
  generatedAt: string | null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data", "couple-photo");
const STATE_PATH = path.join(DATA_DIR, "state.json");

const USER_FILENAME = "user";
const PARTNER_FILENAME = "partner";
const GENERATED_FILENAME = "generated";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extFor(mimeType: string): string {
  return EXT_BY_MIME[mimeType] || "jpg";
}

async function findExisting(baseName: string): Promise<string | null> {
  for (const ext of Object.values(EXT_BY_MIME)) {
    const filePath = path.join(DATA_DIR, `${baseName}.${ext}`);
    try {
      await fs.access(filePath);
      return `/couple-photo-images/${baseName}.${ext}?v=${(await fs.stat(filePath)).mtimeMs}`;
    } catch {
      // try next extension
    }
  }
  return null;
}

async function clearExisting(baseName: string): Promise<void> {
  for (const ext of Object.values(EXT_BY_MIME)) {
    await fs.rm(path.join(DATA_DIR, `${baseName}.${ext}`), { force: true });
  }
}

interface StoredState {
  generatedAt: string | null;
}

async function loadStoredState(): Promise<StoredState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { generatedAt: typeof parsed?.generatedAt === "string" ? parsed.generatedAt : null };
  } catch {
    return { generatedAt: null };
  }
}

async function saveStoredState(state: StoredState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function getCouplePhotoState(): Promise<CouplePhotoState> {
  const [userPhotoUrl, partnerPhotoUrl, generatedUrl, stored] = await Promise.all([
    findExisting(USER_FILENAME),
    findExisting(PARTNER_FILENAME),
    findExisting(GENERATED_FILENAME),
    loadStoredState(),
  ]);

  return {
    userPhotoUrl,
    partnerPhotoUrl,
    generatedUrl,
    generatedAt: generatedUrl ? stored.generatedAt : null,
  };
}

export async function generateCouplePhoto(
  userImage: ImageInput,
  partnerImage: ImageInput,
  styleNote?: string,
): Promise<CouplePhotoState> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  await clearExisting(USER_FILENAME);
  await clearExisting(PARTNER_FILENAME);
  await fs.writeFile(path.join(DATA_DIR, `${USER_FILENAME}.${extFor(userImage.mimeType)}`), userImage.data);
  await fs.writeFile(
    path.join(DATA_DIR, `${PARTNER_FILENAME}.${extFor(partnerImage.mimeType)}`),
    partnerImage.data,
  );

  const generated = await generateCoupleImage(userImage, partnerImage, styleNote);

  await clearExisting(GENERATED_FILENAME);
  await fs.writeFile(
    path.join(DATA_DIR, `${GENERATED_FILENAME}.${extFor(generated.mimeType)}`),
    generated.data,
  );
  await saveStoredState({ generatedAt: new Date().toISOString() });

  return getCouplePhotoState();
}
