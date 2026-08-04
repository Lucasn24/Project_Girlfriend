import { GoogleGenAI } from "@google/genai";
import { personaSystemPrompt, exampleMessages } from "./persona.js";

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

  const exampleBlock = exampleMessages.length
    ? `\n\nReal example messages from this person, for style reference:\n${exampleMessages
        .map((message) => `- ${message}`)
        .join("\n")}`
    : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    config: {
      systemInstruction: personaSystemPrompt + exampleBlock,
      temperature: 1,
      maxOutputTokens: 200,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text.trim();
}
