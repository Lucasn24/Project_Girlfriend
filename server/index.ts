import "dotenv/config";
import cors from "cors";
import express from "express";
import { streamReply, type HistoryTurn } from "./gemini.js";

const app = express();
app.use(cors());
app.use(express.json());

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

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
