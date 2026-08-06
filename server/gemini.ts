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

export async function generateReply(history: HistoryTurn[]): Promise<string> {
  const ai = getClient();

  const lastUserTurn = [...history].reverse().find((turn) => turn.role === "user");
  const similarExchanges = lastUserTurn ? await findSimilarExchanges(lastUserTurn.text) : [];

  const exampleBlock = similarExchanges.length
    ? `\n\nReal past exchanges where this person replied to something similar to what was just said, for reference on how he responds:\n${similarExchanges
        .map((exchange) => `- them: ${exchange.context}\n  him: ${exchange.reply}`)
        .join("\n")}`
    : exampleMessages.length
      ? `\n\nReal example messages from this person, for style reference:\n${exampleMessages
          .map((message) => `- ${message}`)
          .join("\n")}`
      : "";

  const response = await ai.models.generateContent({
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

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text.trim();
}
