import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const INDEX_PATH = "server/data/reply-index.json";

export interface ReplyExchange {
  context: string;
  reply: string;
}

interface IndexedExchange extends ReplyExchange {
  embedding: number[];
}

let client: GoogleGenAI | null = null;
let index: IndexedExchange[] | null = null;
let indexLoadFailed = false;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function loadIndex(): IndexedExchange[] {
  if (index) return index;
  if (indexLoadFailed) return [];
  try {
    const start = performance.now();
    index = JSON.parse(readFileSync(INDEX_PATH, "utf-8")) as IndexedExchange[];
    console.log(
      `[retrieval] loaded ${index.length} indexed exchanges in ${(performance.now() - start).toFixed(0)}ms`,
    );
    return index;
  } catch {
    indexLoadFailed = true;
    console.warn(
      `${INDEX_PATH} not found — run "npm run build:index" to enable style retrieval. Falling back to static examples.`,
    );
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findSimilarExchanges(query: string, k = 6): Promise<ReplyExchange[]> {
  const start = performance.now();
  const entries = loadIndex();
  if (entries.length === 0) return [];

  try {
    const ai = getClient();
    const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    const embedStart = performance.now();
    const response = await ai.models.embedContent({
      model,
      contents: [query],
      config: { taskType: "RETRIEVAL_QUERY" },
    });
    console.log(`[retrieval] embedContent took ${(performance.now() - embedStart).toFixed(0)}ms`);
    const queryVector = response.embeddings?.[0]?.values;
    if (!queryVector) return [];

    const results = entries
      .map((entry) => ({ entry, score: cosineSimilarity(queryVector, entry.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(({ entry }) => ({ context: entry.context, reply: entry.reply }));
    console.log(
      `[retrieval] findSimilarExchanges total ${(performance.now() - start).toFixed(0)}ms`,
    );
    return results;
  } catch (error) {
    console.warn("retrieval failed, falling back to static examples:", error);
    return [];
  }
}
