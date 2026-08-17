import type { CSSProperties } from "react";
import { FireIcon, TrashIcon } from "@phosphor-icons/react";
import { GAME_DEFINITIONS } from "../../data/games";
import { partnerName } from "../../data/thread";
import type { GameOwner, GameResult } from "../../types";
import styles from "./GameSection.module.css";

interface GameSectionProps {
  game: GameResult["game"];
  results: GameResult[];
  onDelete: (id: string) => void;
}

function rank(result: GameResult): number {
  return result.game === "wordle" ? (result.guesses ?? 7) : (result.hints ?? 99);
}

function summaryLabel(result: GameResult): string {
  if (result.game === "wordle") {
    const guessLabel = result.guesses ? `${result.guesses}/6` : "X/6";
    return result.hardMode ? `${guessLabel}*` : guessLabel;
  }
  const parts: string[] = [];
  if (result.hints !== null) parts.push(`${result.hints} hint${result.hints === 1 ? "" : "s"}`);
  if (result.parDelta !== null) {
    parts.push(result.parDelta === 0 ? "at par" : `${result.parDelta > 0 ? "+" : ""}${result.parDelta} par`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function formatPuzzleDate(puzzleDate: string): string {
  return new Date(`${puzzleDate}T00:00:00Z`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface HeadToHeadStats {
  userWins: number;
  partnerWins: number;
  ties: number;
  totalComparable: number;
  userWinRate: number | null;
  partnerWinRate: number | null;
  streakOwner: GameOwner | null;
  streakLength: number;
  userAvg: number | null;
  partnerAvg: number | null;
}

function computeStats(byDate: Map<string, { user?: GameResult; partner?: GameResult }>, datesDesc: string[]): HeadToHeadStats {
  let userWins = 0;
  let partnerWins = 0;
  let ties = 0;
  let userTotal = 0;
  let userCount = 0;
  let partnerTotal = 0;
  let partnerCount = 0;
  let streakOwner: GameOwner | null = null;
  let streakLength = 0;
  let streakBroken = false;

  for (const date of datesDesc) {
    const entry = byDate.get(date)!;
    const userRank = entry.user ? rank(entry.user) : null;
    const partnerRank = entry.partner ? rank(entry.partner) : null;

    if (userRank !== null) {
      userTotal += userRank;
      userCount += 1;
    }
    if (partnerRank !== null) {
      partnerTotal += partnerRank;
      partnerCount += 1;
    }

    if (userRank !== null && partnerRank !== null) {
      const dayWinner: GameOwner | "tie" =
        userRank < partnerRank ? "user" : partnerRank < userRank ? "partner" : "tie";

      if (dayWinner === "user") userWins += 1;
      else if (dayWinner === "partner") partnerWins += 1;
      else ties += 1;

      if (!streakBroken) {
        if (dayWinner === "tie") {
          streakBroken = true;
        } else if (streakOwner === null) {
          streakOwner = dayWinner;
          streakLength = 1;
        } else if (streakOwner === dayWinner) {
          streakLength += 1;
        } else {
          streakBroken = true;
        }
      }
    }
  }

  const totalComparable = userWins + partnerWins + ties;
  return {
    userWins,
    partnerWins,
    ties,
    totalComparable,
    userWinRate: totalComparable > 0 ? Math.round((userWins / totalComparable) * 100) : null,
    partnerWinRate: totalComparable > 0 ? Math.round((partnerWins / totalComparable) * 100) : null,
    streakOwner: streakLength > 0 ? streakOwner : null,
    streakLength,
    userAvg: userCount > 0 ? userTotal / userCount : null,
    partnerAvg: partnerCount > 0 ? partnerTotal / partnerCount : null,
  };
}

interface ScoreCellProps {
  result: GameResult | undefined;
  isWinner: boolean;
  onDelete: (id: string) => void;
}

function ScoreCell({ result, isWinner, onDelete }: ScoreCellProps) {
  if (!result) {
    return <div className={`${styles.cell} ${styles.cellEmpty}`}>—</div>;
  }

  return (
    <div className={`${styles.cell} ${isWinner ? styles.cellWinner : ""}`}>
      <div className={styles.cellHeader}>
        <span className={styles.summary}>{summaryLabel(result)}</span>
        <button
          type="button"
          className={styles.deleteButton}
          aria-label="Delete this score"
          onClick={() => onDelete(result.id)}
        >
          <TrashIcon size={14} />
        </button>
      </div>
      {result.gridEmoji && <pre className={styles.grid}>{result.gridEmoji}</pre>}
    </div>
  );
}

function WordleMark() {
  const cells = ["c1", "c2", "c3", "c4"];
  return (
    <div className={styles.wordleMark} aria-hidden="true">
      {cells.map((cell) => (
        <span key={cell} className={styles.wordleMarkCell} />
      ))}
    </div>
  );
}

function CrypticMark() {
  const pips = ["p1", "p2", "p3", "p4", "p5", "p6"];
  return (
    <div className={styles.crypticMark} aria-hidden="true">
      {pips.map((pip, index) => (
        <span
          key={pip}
          className={`${styles.crypticMarkPip} ${index < 2 ? styles.crypticMarkPipFilled : ""}`}
        />
      ))}
    </div>
  );
}

export function GameSection({ game, results, onDelete }: GameSectionProps) {
  const definition = GAME_DEFINITIONS[game];
  const isWordle = game === "wordle";

  const byDate = new Map<string, { user?: GameResult; partner?: GameResult }>();
  for (const result of results) {
    const entry = byDate.get(result.puzzleDate) ?? {};
    entry[result.owner] = result;
    byDate.set(result.puzzleDate, entry);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  const stats = computeStats(byDate, dates);

  return (
    <section
      className={`${styles.card} ${isWordle ? styles.cardWordle : styles.cardCryptic}`}
      style={{ "--accent": definition.accent } as CSSProperties}
    >
      <header className={styles.header}>
        {isWordle ? <WordleMark /> : <CrypticMark />}
        <div className={styles.headerText}>
          <h2 className={styles.title}>{definition.label}</h2>
          <p className={styles.tagline}>{isWordle ? "Daily word puzzle" : "Daily cryptic clue"}</p>
        </div>
      </header>

      {stats.totalComparable > 0 ? (
        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Head-to-head</span>
            <span className={styles.statValue}>
              {stats.userWins}–{stats.partnerWins}
              {stats.ties > 0 ? ` (${stats.ties} tie${stats.ties === 1 ? "" : "s"})` : ""}
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Win rate</span>
            <span className={styles.statValue}>
              {stats.userWinRate}% / {stats.partnerWinRate}%
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Streak</span>
            <span className={styles.statValue}>
              {stats.streakOwner ? (
                <>
                  <FireIcon size={12} weight="fill" className={styles.streakIcon} />
                  {stats.streakOwner === "user" ? "You" : partnerName} · {stats.streakLength}
                </>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Avg {isWordle ? "guesses" : "hints"}</span>
            <span className={styles.statValue}>
              {stats.userAvg !== null ? stats.userAvg.toFixed(1) : "—"} /{" "}
              {stats.partnerAvg !== null ? stats.partnerAvg.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.statsEmpty}>Play the same day as {partnerName} to see head-to-head stats.</p>
      )}

      {dates.length === 0 ? (
        <p className={styles.empty}>No {definition.label} scores yet.</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.columnLabels}>
            <span />
            <span className={styles.columnLabel}>You</span>
            <span className={styles.columnLabel}>{partnerName}</span>
          </div>
          {dates.map((date) => {
            const entry = byDate.get(date)!;
            const userRank = entry.user ? rank(entry.user) : null;
            const partnerRank = entry.partner ? rank(entry.partner) : null;
            const canCompare = userRank !== null && partnerRank !== null;

            return (
              <div key={date} className={styles.row}>
                <span className={styles.date}>{formatPuzzleDate(date)}</span>
                <ScoreCell
                  result={entry.user}
                  isWinner={canCompare && userRank! < partnerRank!}
                  onDelete={onDelete}
                />
                <ScoreCell
                  result={entry.partner}
                  isWinner={canCompare && partnerRank! < userRank!}
                  onDelete={onDelete}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
