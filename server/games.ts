import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGameText } from "./gameParsers.js";

export type GameOwner = "user" | "partner";

interface GameResultBase {
  id: string;
  owner: GameOwner;
  puzzleDate: string;
  submittedAt: string;
  rawText: string;
  gridEmoji: string;
}

export interface WordleResult extends GameResultBase {
  game: "wordle";
  puzzleNumber: number | null;
  guesses: number | null;
  hardMode: boolean;
}

export interface MinuteCrypticResult extends GameResultBase {
  game: "minute-cryptic";
  hints: number | null;
  parDelta: number | null;
  solverCount: number | null;
}

export type GameResult = WordleResult | MinuteCrypticResult;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "data", "games.json");

async function readAll(): Promise<GameResult[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(results: GameResult[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(results, null, 2));
}

export async function getGames(): Promise<GameResult[]> {
  const results = await readAll();
  return results.sort((a, b) => b.puzzleDate.localeCompare(a.puzzleDate));
}

export async function addGame(owner: GameOwner, rawText: string): Promise<GameResult> {
  const parsed = parseGameText(rawText);
  if (!parsed) {
    throw new Error("Couldn't recognize this as a Wordle or Minute Cryptic result.");
  }

  const result = {
    id: randomUUID(),
    owner,
    submittedAt: new Date().toISOString(),
    ...parsed,
  } as GameResult;

  const results = await readAll();
  results.push(result);
  await writeAll(results);
  return result;
}

export async function deleteGame(id: string): Promise<boolean> {
  const results = await readAll();
  const next = results.filter((result) => result.id !== id);
  if (next.length === results.length) return false;
  await writeAll(next);
  return true;
}
