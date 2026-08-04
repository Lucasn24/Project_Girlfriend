import "dotenv/config";
import cors from "cors";
import express from "express";
import { generateReply, type HistoryTurn } from "./gemini.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const history = req.body?.history as HistoryTurn[] | undefined;

  if (!Array.isArray(history) || history.length === 0) {
    res.status(400).json({ error: "history must be a non-empty array" });
    return;
  }

  try {
    const reply = await generateReply(history);
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate a reply",
    });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
