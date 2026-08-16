import { useCallback, useEffect, useRef, useState } from "react";
import { thread as initialThread } from "../data/thread";
import type { ChatMessage, ThreadItem } from "../types";

let nextId = 1000;

// Grace period after a reply finishes before dispatching the next one, so a
// burst of messages sent while the AI was "typing" gets batched into a
// single follow-up reply instead of one request per message.
const FOLLOWUP_DEBOUNCE_MS = 700;

function formatNow(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toHistoryRole(sender: ChatMessage["sender"]): "user" | "model" {
  return sender === "you" ? "user" : "model";
}

function toHistoryText(message: ChatMessage): string {
  if (message.type === "text") return message.text;
  if (message.type === "voice") return "[voice message]";
  return message.caption ? `[sent a photo] ${message.caption}` : "[sent a photo]";
}

function toHistory(items: ThreadItem[]): { role: "user" | "model"; text: string }[] {
  return items
    .filter((item): item is ChatMessage => item.kind === "message")
    .map((message) => ({ role: toHistoryRole(message.sender), text: toHistoryText(message) }));
}

export function useChat() {
  const [items, setItems] = useState<ThreadItem[]>(initialThread);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kept in sync imperatively (not via `itemsRef.current = items` in the
  // render body) because dispatchReply can run synchronously right after
  // setItems, before React has re-rendered — reading a stale ref there
  // would drop the message that was just sent.
  const itemsRef = useRef(items);

  const updateItems = useCallback((updater: (prev: ThreadItem[]) => ThreadItem[]) => {
    const next = updater(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const requestInFlightRef = useRef(false);
  const pendingReplyRef = useRef(false);
  const followupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dispatchReply = useCallback(async () => {
    if (requestInFlightRef.current) {
      pendingReplyRef.current = true;
      return;
    }

    requestInFlightRef.current = true;
    setIsSending(true);
    setError(null);

    // Snapshot how many items this reply is answering. User messages sent
    // while the request is in flight get appended after this point, so the
    // reply must be inserted here rather than at whatever the array's end
    // is once the stream resolves — otherwise it can land after later user
    // messages it never saw, which also breaks the model/user turn order
    // Gemini expects on the next request.
    const replyPosition = itemsRef.current.length;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: toHistory(itemsRef.current) }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      const aiMessageId = `local-${nextId++}`;
      let aiText = "";
      let aiMessageAdded = false;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        aiText += chunk;

        if (!aiMessageAdded) {
          aiMessageAdded = true;
          const aiMessage: ChatMessage = {
            kind: "message",
            type: "text",
            id: aiMessageId,
            sender: "partner-ai",
            text: aiText,
            timestamp: formatNow(),
          };
          updateItems((prev) => [
            ...prev.slice(0, replyPosition),
            aiMessage,
            ...prev.slice(replyPosition),
          ]);
        } else {
          updateItems((prev) =>
            prev.map((item) =>
              item.kind === "message" && item.id === aiMessageId
                ? { ...item, text: aiText }
                : item,
            ),
          );
        }
      }

      if (!aiMessageAdded) {
        throw new Error("Something went wrong");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      requestInFlightRef.current = false;
      setIsSending(false);

      if (pendingReplyRef.current) {
        pendingReplyRef.current = false;
        scheduleFollowup();
      }
    }
  }, [updateItems]);

  const scheduleFollowup = useCallback(() => {
    if (followupTimerRef.current) clearTimeout(followupTimerRef.current);
    followupTimerRef.current = setTimeout(() => {
      followupTimerRef.current = null;
      dispatchReply();
    }, FOLLOWUP_DEBOUNCE_MS);
  }, [dispatchReply]);

  useEffect(() => {
    return () => {
      if (followupTimerRef.current) clearTimeout(followupTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = {
        kind: "message",
        type: "text",
        id: `local-${nextId++}`,
        sender: "you",
        text: trimmed,
        timestamp: formatNow(),
        status: "sent",
      };

      updateItems((prev) => [...prev, userMessage]);

      if (requestInFlightRef.current) {
        // Caught by the in-flight reply's `finally` once it finishes.
        pendingReplyRef.current = true;
        return;
      }

      if (followupTimerRef.current) {
        // Already waiting to catch up on a burst — extend the window.
        scheduleFollowup();
        return;
      }

      dispatchReply();
    },
    [dispatchReply, scheduleFollowup, updateItems],
  );

  return { items, sendMessage, isSending, error };
}
