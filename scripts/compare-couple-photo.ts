import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { fal } from "@fal-ai/client";

const DEFAULT_PROMPT =
  "Combine these two people into a single photorealistic full-body photo of them together as a couple, " +
  "standing side by side, arms around each other, in a natural everyday setting. " +
  "Preserve each person's face, body proportions, and exact outfit from their reference photo.";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function mimeTypeFor(path: string): string {
  const mime = MIME_BY_EXT[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image extension for ${path} (use jpg/png/webp)`);
  return mime;
}

async function runGemini(
  person1: { data: Buffer; mimeType: string },
  person2: { data: Buffer; mimeType: string },
  prompt: string,
  outDir: string,
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[gemini] skipped — GEMINI_API_KEY not set");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const start = performance.now();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: person1.data.toString("base64"), mimeType: person1.mimeType } },
          { inlineData: { data: person2.data.toString("base64"), mimeType: person2.mimeType } },
          { text: prompt },
        ],
      },
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((part) => part.text)?.text;
    throw new Error(`Gemini returned no image${textPart ? `: ${textPart}` : ""}`);
  }

  const outPath = join(outDir, "gemini.png");
  writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, "base64"));
  console.log(`[gemini] saved ${outPath} in ${(performance.now() - start).toFixed(0)}ms`);
}

async function runFluxKontext(
  person1: { data: Buffer; mimeType: string },
  person2: { data: Buffer; mimeType: string },
  prompt: string,
  outDir: string,
): Promise<void> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.log("[flux-kontext] skipped — FAL_KEY not set");
    return;
  }

  fal.config({ credentials: falKey });
  const start = performance.now();

  const [url1, url2] = await Promise.all([
    fal.storage.upload(new Blob([new Uint8Array(person1.data)], { type: person1.mimeType })),
    fal.storage.upload(new Blob([new Uint8Array(person2.data)], { type: person2.mimeType })),
  ]);

  // If this endpoint id 404s, check fal.ai/models for the current Flux Kontext
  // multi-image endpoint id — fal renames/versions these periodically.
  const endpoint = process.env.FAL_MODEL || "fal-ai/flux-pro/kontext/max/multi";

  const result = await fal.subscribe(endpoint, {
    input: {
      prompt,
      image_urls: [url1, url2],
    },
    logs: false,
  });

  const imageUrl = (result.data as { images?: { url: string }[] })?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(`Flux Kontext returned no image: ${JSON.stringify(result.data)}`);
  }

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const outPath = join(outDir, "flux-kontext.png");
  writeFileSync(outPath, imageBuffer);
  console.log(`[flux-kontext] saved ${outPath} in ${(performance.now() - start).toFixed(0)}ms`);
}

async function main() {
  const [person1Path, person2Path, ...promptParts] = process.argv.slice(2);

  if (!person1Path || !person2Path) {
    console.error(
      "Usage: tsx scripts/compare-couple-photo.ts <person1.jpg> <person2.jpg> [prompt]",
    );
    process.exit(1);
  }

  const prompt = promptParts.join(" ") || DEFAULT_PROMPT;

  const person1 = { data: readFileSync(person1Path), mimeType: mimeTypeFor(person1Path) };
  const person2 = { data: readFileSync(person2Path), mimeType: mimeTypeFor(person2Path) };

  const outDir = join("scratch", "couple-compare", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  console.log(`Output dir: ${outDir}`);
  console.log(`Prompt: ${prompt}\n`);

  const results = await Promise.allSettled([
    runGemini(person1, person2, prompt, outDir),
    runFluxKontext(person1, person2, prompt, outDir),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Generation failed:", result.reason);
    }
  }
}

main();
