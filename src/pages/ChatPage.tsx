import { useEffect, useRef } from "react";
import { WarningIcon } from "@phosphor-icons/react";
import { ChatHeader } from "../components/ChatHeader";
import { DisclosureBanner } from "../components/DisclosureBanner";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { ThreadDivider } from "../components/ThreadDivider";
import { TypingIndicator } from "../components/TypingIndicator";
import { useChat } from "../hooks/useChat";

export function ChatPage() {
  const { items, sendMessage, isSending, error } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, isSending]);

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col bg-bg">
      <ChatHeader />
      <DisclosureBanner />

      <main className="no-scrollbar flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-3">
          {items.map((item) =>
            item.kind === "divider" ? (
              <ThreadDivider key={item.id} {...item} />
            ) : (
              <MessageBubble key={item.id} message={item} />
            ),
          )}
          {isSending && <TypingIndicator />}
          {error && (
            <div className="flex animate-fade-up items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <WarningIcon size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <MessageComposer onSend={sendMessage} disabled={isSending} />
    </div>
  );
}
