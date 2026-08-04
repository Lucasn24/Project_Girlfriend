import { useState, type KeyboardEvent } from "react";
import {
  HeartIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";
import { partnerName } from "../../data/thread";
import styles from "./MessageComposer.module.css";

interface MessageComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageComposer({ onSend, disabled }: MessageComposerProps) {
  const [value, setValue] = useState("");

  const submit = (text: string) => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit(value);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => submit("Just thinking about you ❤️")}
        className={styles.thinkingButton}
      >
        <HeartIcon size={13} weight="fill" />
        Send "thinking of you"
      </button>

      <div className={styles.row}>
        <button type="button" aria-label="Attach a file" className={styles.iconButton}>
          <PaperclipIcon size={20} />
        </button>

        <div className={styles.inputWrap}>
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={`Message ${partnerName}…`}
            aria-label={`Message ${partnerName}`}
            className={styles.input}
          />
        </div>

        <button
          type="button"
          aria-label="Record a voice message"
          className={styles.iconButton}
        >
          <MicrophoneIcon size={20} />
        </button>

        <button
          type="button"
          aria-label="Send message"
          disabled={disabled || !value.trim()}
          onClick={() => submit(value)}
          className={styles.sendButton}
        >
          <PaperPlaneTiltIcon size={18} weight="fill" />
        </button>
      </div>

      <p className={styles.hint}>
        {partnerName} will see this and can reply herself once she's awake.
      </p>
    </div>
  );
}
