export type GameOwner = "user" | "partner";

interface ParsedResultBase {
  puzzleDate: string;
  rawText: string;
  gridEmoji: string;
}

export interface ParsedWordleResult extends ParsedResultBase {
  game: "wordle";
  puzzleNumber: number | null;
  guesses: number | null;
  hardMode: boolean;
}

export interface ParsedMinuteCrypticResult extends ParsedResultBase {
  game: "minute-cryptic";
  hints: number | null;
  parDelta: number | null;
  solverCount: number | null;
}

export type ParsedGameResult = ParsedWordleResult | ParsedMinuteCrypticResult;

const EMOJI_LINE = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}️‍]{3,}$/u;

export function extractEmojiLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => EMOJI_LINE.test(line));
}

const WORDLE_EPOCH_UTC_MS = Date.UTC(2021, 5, 19); // Wordle #0 was 2021-06-19
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateFromWordleNumber(puzzleNumber: number): string {
  const date = new Date(WORDLE_EPOCH_UTC_MS + puzzleNumber * DAY_MS);
  return date.toISOString().slice(0, 10);
}

const WORDLE_PATTERN = /Wordle\s+([\d,]+)\s+([1-6X])\/6(\*)?/i;

export function parseWordle(text: string): ParsedWordleResult | null {
  const match = WORDLE_PATTERN.exec(text);
  if (!match) return null;

  const puzzleNumber = Number.parseInt(match[1].replace(/,/g, ""), 10);
  const guesses = match[2].toUpperCase() === "X" ? null : Number.parseInt(match[2], 10);

  return {
    game: "wordle",
    puzzleDate: Number.isFinite(puzzleNumber) ? isoDateFromWordleNumber(puzzleNumber) : new Date().toISOString().slice(0, 10),
    puzzleNumber: Number.isFinite(puzzleNumber) ? puzzleNumber : null,
    guesses,
    hardMode: Boolean(match[3]),
    rawText: text,
    gridEmoji: extractEmojiLines(text).join("\n"),
  };
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MINUTE_CRYPTIC_HEADER = /Minute Cryptic\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/i;
const HINTS_PATTERN =
  /(\d+)\s+hints?\s*[-–]\s*(?:(\d+)\s+(over|under)\s+the community par|at the community par)/i;
const SOLVER_COUNT_PATTERN = /\(([\d,]+)\s+solvers?\s+so far\)/i;

function isoDateFromParts(day: number, monthName: string, year: number): string | null {
  const monthIndex = MONTH_NAMES.indexOf(monthName.toLowerCase());
  if (monthIndex === -1) return null;
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function parseMinuteCryptic(text: string): ParsedMinuteCrypticResult | null {
  const headerMatch = MINUTE_CRYPTIC_HEADER.exec(text);
  if (!headerMatch) return null;

  const puzzleDate =
    isoDateFromParts(Number.parseInt(headerMatch[1], 10), headerMatch[2], Number.parseInt(headerMatch[3], 10)) ??
    new Date().toISOString().slice(0, 10);

  const hintsMatch = HINTS_PATTERN.exec(text);
  const hints = hintsMatch ? Number.parseInt(hintsMatch[1], 10) : null;
  const parDelta = hintsMatch
    ? hintsMatch[2]
      ? Number.parseInt(hintsMatch[2], 10) * (hintsMatch[3].toLowerCase() === "under" ? -1 : 1)
      : 0
    : null;

  const solverMatch = SOLVER_COUNT_PATTERN.exec(text);
  const solverCount = solverMatch ? Number.parseInt(solverMatch[1].replace(/,/g, ""), 10) : null;

  return {
    game: "minute-cryptic",
    puzzleDate,
    hints,
    parDelta,
    solverCount,
    rawText: text,
    gridEmoji: extractEmojiLines(text).join("\n"),
  };
}

export function parseGameText(rawText: string): ParsedGameResult | null {
  return parseWordle(rawText) ?? parseMinuteCryptic(rawText);
}
