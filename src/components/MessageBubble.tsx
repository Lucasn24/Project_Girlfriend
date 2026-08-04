import {
  CheckIcon,
  ChecksIcon,
  ImageIcon,
  PlayIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import type { ChatMessage } from "../types";
import { partnerName } from "../data/thread";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isYou = message.sender === "you";
  const isAi = message.sender === "partner-ai";

  return (
    <div
      className={`flex animate-fade-up flex-col ${isYou ? "items-end" : "items-start"}`}
    >
      {isAi && (
        <span className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
          <SparkleIcon size={11} weight="fill" />
          {partnerName}'s AI
        </span>
      )}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 sm:max-w-[65%] ${
          isYou
            ? "rounded-br-md bg-primary text-white"
            : isAi
              ? "rounded-bl-md border border-dashed border-secondary/40 bg-surface text-fg"
              : "rounded-bl-md bg-surface-alt text-fg"
        }`}
      >
        {message.type === "text" && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.text}
          </p>
        )}

        {message.type === "voice" && (
          <div className="flex items-center gap-2.5 py-0.5">
            <button
              type="button"
              aria-label="Play voice message"
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ${
                isYou ? "bg-white/20 hover:bg-white/30" : "bg-primary/15 text-primary hover:bg-primary/25"
              }`}
            >
              <PlayIcon size={14} weight="fill" />
            </button>
            <div className="flex h-6 flex-1 items-center gap-0.5" aria-hidden="true">
              {message.waveform.map((height, index) => (
                <span
                  key={index}
                  className={`w-0.5 rounded-full ${isYou ? "bg-white/60" : "bg-fg-muted/50"}`}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <span
              className={`shrink-0 text-xs ${isYou ? "text-white/80" : "text-fg-muted"}`}
            >
              {message.duration}
            </span>
          </div>
        )}

        {message.type === "photo" && (
          <div className="-mx-1 -mt-0.5">
            <div
              className="flex aspect-4/3 w-56 items-center justify-center rounded-xl sm:w-64"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)",
              }}
            >
              <ImageIcon size={32} weight="light" className="text-white/80" />
            </div>
            {message.caption && (
              <p
                className={`mt-1.5 px-1 text-[15px] leading-relaxed ${isYou ? "text-white" : "text-fg"}`}
              >
                {message.caption}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-fg-muted ${isYou ? "flex-row-reverse" : ""}`}
      >
        <span>{message.timestamp}</span>
        {isYou && message.status && (
          <span aria-label={message.status}>
            {message.status === "sent" ? (
              <CheckIcon size={13} weight="bold" />
            ) : (
              <ChecksIcon
                size={13}
                weight="bold"
                className={message.status === "read" ? "text-secondary" : undefined}
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
