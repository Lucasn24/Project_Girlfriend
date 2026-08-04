import { useState, type KeyboardEvent } from "react";
import {
  HeartIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";
import { partnerName } from "../data/thread";

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
    <div className="sticky bottom-0 border-t border-border bg-surface px-4 pb-4 pt-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => submit("Just thinking about you ❤️")}
        className="mb-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <HeartIcon size={13} weight="fill" />
        Send "thinking of you"
      </button>

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label="Attach a file"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-alt hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PaperclipIcon size={20} />
        </button>

        <div className="flex min-h-11 flex-1 items-center rounded-3xl border border-border bg-surface-alt px-4">
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={`Message ${partnerName}…`}
            aria-label={`Message ${partnerName}`}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-fg placeholder:text-fg-muted focus:outline-none disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          aria-label="Record a voice message"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-alt hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MicrophoneIcon size={20} />
        </button>

        <button
          type="button"
          aria-label="Send message"
          disabled={disabled || !value.trim()}
          onClick={() => submit(value)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PaperPlaneTiltIcon size={18} weight="fill" />
        </button>
      </div>

      <p className="mt-2 px-1 text-center text-[11px] text-fg-muted">
        {partnerName} will see this and can reply herself once she's awake.
      </p>
    </div>
  );
}
