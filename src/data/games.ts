import type { GameResult } from "../types";

interface GameDefinition {
  label: string;
  accent: string;
}

export const GAME_DEFINITIONS: Record<GameResult["game"], GameDefinition> = {
  wordle: { label: "Wordle", accent: "#6aaa64" },
  "minute-cryptic": { label: "Minute Cryptic", accent: "#8a4fff" },
};

export const GAME_ORDER: GameResult["game"][] = ["wordle", "minute-cryptic"];
