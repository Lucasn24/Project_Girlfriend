import { GoogleGenAI } from "@google/genai";
import { personaSystemPrompt, exampleMessages } from "./persona.js";
import { findSimilarExchanges } from "./retrieval.js";

export interface HistoryTurn {
  role: "user" | "model";
  text: string;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to .env",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export async function* streamReply(history: HistoryTurn[]): AsyncGenerator<string> {
  const start = performance.now();
  const ai = getClient();

  const lastUserTurn = [...history].reverse().find((turn) => turn.role === "user");
  const retrievalStart = performance.now();
  const similarExchanges = lastUserTurn ? await findSimilarExchanges(lastUserTurn.text) : [];
  console.log(
    `[gemini] retrieval: ${similarExchanges.length} matches in ${(performance.now() - retrievalStart).toFixed(0)}ms`,
  );

  const exampleBlock = similarExchanges.length
    ? `\n\nReal past exchanges where this person replied to something similar to what was just said, for reference on how he responds:\n${similarExchanges
        .map((exchange) => `- them: ${exchange.context}\n  him: ${exchange.reply}`)
        .join("\n")}`
    : exampleMessages.length
      ? `\n\nReal example messages from this person, for style reference:\n${exampleMessages
          .map((message) => `- ${message}`)
          .join("\n")}`
      : "";

  const generateStart = performance.now();
  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    config: {
      systemInstruction: personaSystemPrompt + exampleBlock,
      temperature: 1,
      maxOutputTokens: 1024,
    },
  });

  let receivedAny = false;
  let firstChunk = true;
  for await (const chunk of stream) {
    const text = chunk.text;
    if (!text) continue;
    if (firstChunk) {
      console.log(`[gemini] first chunk after ${(performance.now() - generateStart).toFixed(0)}ms`);
      firstChunk = false;
    }
    receivedAny = true;
    yield text;
  }

  console.log(`[gemini] generateContentStream took ${(performance.now() - generateStart).toFixed(0)}ms`);
  console.log(`[gemini] generateReply total ${(performance.now() - start).toFixed(0)}ms`);

  if (!receivedAny) {
    throw new Error("Gemini returned an empty response");
  }
}
