import { useEffect, useRef } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { ChatHeader } from "../components/chatbot/ChatHeader";
import { DisclosureBanner } from "../components/chatbot/DisclosureBanner";
import { MessageBubble } from "../components/chatbot/MessageBubble";
import { MessageComposer } from "../components/chatbot/MessageComposer";
import { ThreadDivider } from "../components/chatbot/ThreadDivider";
import { TypingIndicator } from "../components/chatbot/TypingIndicator";
import type { useChat } from "../hooks/chat/useChat";
import styles from "./ChatPage.module.css";

interface ChatPageProps {
  chat: ReturnType<typeof useChat>;
}

export function ChatPage({ chat }: ChatPageProps) {
  const { items, sendMessage, isSending, error } = chat;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, isSending]);

  return (
    <div className={styles.page}>
      <ChatHeader />
      <DisclosureBanner />

      <main className={`${styles.main} no-scrollbar`}>
        <div className={styles.list}>
          {items.map((item) =>
            item.kind === "divider" ? (
              <ThreadDivider key={item.id} {...item} />
            ) : (
              <MessageBubble key={item.id} message={item} />
            ),
          )}
          {isSending && <TypingIndicator />}
          {error && (
            <div className={styles.errorBanner}>
              <WarningIcon size={16} weight="bold" className={styles.errorIcon} />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <MessageComposer onSend={sendMessage} />
    </div>
  );
}
