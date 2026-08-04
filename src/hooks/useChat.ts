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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      const aiMessage: ChatMessage = {
        kind: "message",
        type: "text",
        id: `local-${nextId++}`,
        sender: "partner-ai",
        text: data.reply as string,
        timestamp: formatNow(),
      };

      setItems((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  }, []);

  return { items, sendMessage, isSending, error };
}
