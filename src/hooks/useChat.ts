import { useCallback, useState } from "react";
import { thread as initialThread } from "../data/thread";
import type { ChatMessage, ThreadItem } from "../types";

let nextId = 1000;

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

export function useChat() {
  const [items, setItems] = useState<ThreadItem[]>(initialThread);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError(null);

    const userMessage: ChatMessage = {
      kind: "message",
      type: "text",
      id: `local-${nextId++}`,
      sender: "you",
      text: trimmed,
      timestamp: formatNow(),
      status: "sent",
    };

    let historyForRequest: { role: "user" | "model"; text: string }[] = [];

    setItems((prev) => {
      const next = [...prev, userMessage];
      historyForRequest = next
        .filter((item): item is ChatMessage => item.kind === "message")
        .map((message) => ({
          role: toHistoryRole(message.sender),
          text: toHistoryText(message),
        }));
      return next;
    });

    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historyForRequest }),
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
          setItems((prev) => [...prev, aiMessage]);
        } else {
          setItems((prev) =>
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
      setIsSending(false);
    }
  }, []);

  return { items, sendMessage, isSending, error };
}
