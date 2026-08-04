import { SparkleIcon } from "@phosphor-icons/react";
import { partnerName } from "../data/thread";

export function TypingIndicator() {
  return (
    <div className="flex animate-fade-up flex-col items-start">
      <span className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
        <SparkleIcon size={11} weight="fill" />
        {partnerName}'s AI is typing
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-dashed border-secondary/40 bg-surface px-4 py-3.5">
        <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-fg-muted [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-fg-muted [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-fg-muted [animation-delay:300ms]" />
      </div>
    </div>
  );
}
