import { useState } from "react";
import { ClipboardTextIcon, PlusIcon, SpinnerGapIcon } from "@phosphor-icons/react";
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
    <section className={styles.card}>
      <div className={styles.top}>
        <span className={styles.iconWrap} aria-hidden="true">
          <ClipboardTextIcon size={16} weight="fill" />
        </span>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Add a score</h2>
          <p className={styles.tagline}>Paste your Wordle or Minute Cryptic share text</p>
        </div>
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
      </div>

      <div className={styles.inputRow}>
        <textarea
          className={styles.textarea}
          placeholder="Paste your result here…"
          value={rawText}
          rows={2}
          onChange={(event) => setRawText(event.target.value)}
        />
        <button type="button" className={styles.submitButton} disabled={!canSubmit} onClick={handleSubmit}>
          {isSubmitting ? (
            <SpinnerGapIcon size={18} className={styles.spinner} />
          ) : (
            <>
              <PlusIcon size={16} weight="bold" />
              Add
            </>
          )}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
