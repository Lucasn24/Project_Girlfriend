import {
  CheckIcon,
  ChecksIcon,
  ImageIcon,
  PlayIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import type { ChatMessage } from "../../types";
import { partnerName } from "../../data/thread";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: ChatMessage;
}

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isYou = message.sender === "you";
  const isAi = message.sender === "partner-ai";

  return (
    <div className={cx(styles.row, isYou ? styles.rowYou : styles.rowOther)}>
      {isAi && (
        <span className={styles.aiBadge}>
          <SparkleIcon size={11} weight="fill" />
          {partnerName}'s AI
        </span>
      )}

      <div
        className={cx(
          styles.bubble,
          isYou ? styles.bubbleYou : isAi ? styles.bubbleAi : styles.bubbleOther,
        )}
      >
        {message.type === "text" && <p className={styles.text}>{message.text}</p>}

        {message.type === "voice" && (
          <div className={styles.voiceRow}>
            <button
              type="button"
              aria-label="Play voice message"
              className={cx(
                styles.playButton,
                isYou ? styles.playButtonYou : styles.playButtonOther,
              )}
            >
              <PlayIcon size={14} weight="fill" />
            </button>
            <div className={styles.waveform} aria-hidden="true">
              {message.waveform.map((height, index) => (
                <span
                  key={index}
                  className={cx(
                    styles.waveBar,
                    isYou ? styles.waveBarYou : styles.waveBarOther,
                  )}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <span
              className={cx(
                styles.duration,
                isYou ? styles.durationYou : styles.durationOther,
              )}
            >
              {message.duration}
            </span>
          </div>
        )}

        {message.type === "photo" && (
          <div className={styles.photoWrap}>
            <div className={styles.photoPlaceholder}>
              <ImageIcon size={32} weight="light" className={styles.photoIcon} />
            </div>
            {message.caption && (
              <p
                className={cx(
                  styles.caption,
                  isYou ? styles.captionYou : styles.captionOther,
                )}
              >
                {message.caption}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={cx(styles.meta, isYou ? styles.metaYou : undefined)}>
        <span>{message.timestamp}</span>
        {isYou && message.status && (
          <span aria-label={message.status}>
            {message.status === "sent" ? (
              <CheckIcon size={13} weight="bold" />
            ) : (
              <ChecksIcon
                size={13}
                weight="bold"
                className={message.status === "read" ? styles.statusRead : undefined}
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
