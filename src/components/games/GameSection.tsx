import { TrashIcon, TrophyIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../dashboard/DashboardCard";
import { GAME_DEFINITIONS } from "../../data/games";
import { partnerName } from "../../data/thread";
import type { GameResult } from "../../types";
import styles from "./GameSection.module.css";

interface GameSectionProps {
  game: GameResult["game"];
  results: GameResult[];
  onDelete: (id: string) => void;
}

function rank(result: GameResult): number | null {
  return result.game === "wordle" ? (result.guesses ?? 7) : result.hints;
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

export function GameSection({ game, results, onDelete }: GameSectionProps) {
  const definition = GAME_DEFINITIONS[game];

  const byDate = new Map<string, { user?: GameResult; partner?: GameResult }>();
  for (const result of results) {
    const entry = byDate.get(result.puzzleDate) ?? {};
    entry[result.owner] = result;
    byDate.set(result.puzzleDate, entry);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <DashboardCard icon={<TrophyIcon size={16} weight="fill" />} title={definition.label}>
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
    </DashboardCard>
  );
}
