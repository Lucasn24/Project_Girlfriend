import { fal } from "@fal-ai/client";

export interface ImageInput {
  data: Buffer;
  mimeType: string;
}

export interface ImageOutput {
  data: Buffer;
  mimeType: string;
}

const ACCURACY_INSTRUCTIONS =
  "You are given two reference photos, each a full-body photo of one person. Generate a single image showing " +
  "both people together as a couple, standing close side by side with a natural, affectionate pose such as an " +
  "arm around each other.\n\n" +
  "Identity accuracy is the top priority:\n" +
  "- Match each person's face exactly to their reference photo: same facial structure, skin tone, eye color, " +
  "hair color and style, and expression. Do not blend, average, morph, or swap facial features between the two " +
  "people — each face must be clearly recognizable as that specific person.\n" +
  "- Match each person's body proportions, build, and height relative to the other person exactly as shown in " +
  "their reference photo.\n" +
  "- Match each person's exact outfit from their reference photo — the same clothing items, colors, patterns, " +
  "and fit. Do not invent, remove, or restyle clothing.\n" +
  "- Keep both people fully visible head-to-toe, in frame, and in proportion to each other.\n" +
  "- Use consistent, unified lighting, shadows, and color grading across both people so they look like they were " +
  "photographed together in the same scene, not composited from two different photos.";

const DEFAULT_STYLE_NOTE =
  "Photorealistic, as if shot on a DSLR camera with natural lighting — not illustrated, not painterly, not " +
  "stylized.";

function buildCouplePrompt(styleNote?: string): string {
  const trimmedNote = styleNote?.trim();
  const styleSection = trimmedNote
    ? `Apply this visual style to the scene, while still strictly following every identity, body, and outfit ` +
      `accuracy requirement above: ${trimmedNote}`
    : DEFAULT_STYLE_NOTE;

  return `${ACCURACY_INSTRUCTIONS}\n\n${styleSection}`;
}

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error("FAL_KEY is not set. Get a key at https://fal.ai/dashboard/keys and add it to .env");
  }
  fal.config({ credentials: apiKey });
  configured = true;
}

export async function generateCoupleImage(
  person1: ImageInput,
  person2: ImageInput,
  styleNote?: string,
): Promise<ImageOutput> {
  ensureConfigured();
  const start = performance.now();
  const prompt = buildCouplePrompt(styleNote);

  const [url1, url2] = await Promise.all([
    fal.storage.upload(new Blob([new Uint8Array(person1.data)], { type: person1.mimeType })),
    fal.storage.upload(new Blob([new Uint8Array(person2.data)], { type: person2.mimeType })),
  ]);

  const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
    input: { prompt, image_urls: [url1, url2] },
    logs: false,
  });

  const image = result.data.images?.[0];
  if (!image) {
    throw new Error("Flux Kontext returned no image");
  }

  const imageResponse = await fetch(image.url);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  console.log(`[flux-kontext] generated image in ${(performance.now() - start).toFixed(0)}ms`);

  return { data: buffer, mimeType: image.content_type || "image/jpeg" };
}
