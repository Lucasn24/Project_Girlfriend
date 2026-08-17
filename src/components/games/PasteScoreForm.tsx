import { useState } from "react";
import { ClipboardTextIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { DashboardCard } from "../dashboard/DashboardCard";
import { partnerName } from "../../data/thread";
import type { GameOwner } from "../../types";
import styles from "./PasteScoreForm.module.css";

interface PasteScoreFormProps {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (owner: GameOwner, rawText: string) => Promise<boolean>;
}

export function PasteScoreForm({ isSubmitting, error, onSubmit }: PasteScoreFormProps) {
  const [owner, setOwner] = useState<GameOwner>("user");
  const [rawText, setRawText] = useState("");

  const canSubmit = rawText.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onSubmit(owner, rawText);
    if (ok) setRawText("");
  };

  return (
    <DashboardCard icon={<ClipboardTextIcon size={16} weight="fill" />} title="Add a score">
      <div className={styles.segmented}>
        <button
          type="button"
          className={`${styles.segment} ${owner === "user" ? styles.segmentActive : ""}`}
          onClick={() => setOwner("user")}
          aria-pressed={owner === "user"}
        >
          You
        </button>
        <button
          type="button"
          className={`${styles.segment} ${owner === "partner" ? styles.segmentActive : ""}`}
          onClick={() => setOwner("partner")}
          aria-pressed={owner === "partner"}
        >
          {partnerName}
        </button>
      </div>

      <textarea
        className={styles.textarea}
        placeholder="Paste your Wordle or Minute Cryptic share text here…"
        value={rawText}
        rows={5}
        onChange={(event) => setRawText(event.target.value)}
      />

      <div className={styles.actions}>
        <button type="button" className={styles.submitButton} disabled={!canSubmit} onClick={handleSubmit}>
          {isSubmitting ? (
            <>
              <SpinnerGapIcon size={18} className={styles.spinner} />
              Adding…
            </>
          ) : (
            "Add score"
          )}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </DashboardCard>
  );
}
