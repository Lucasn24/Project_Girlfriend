import { useCallback, useEffect, useState } from "react";
import type { GameOwner, GameResult } from "../types";

export function useGames() {
  const [results, setResults] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/games");
      if (!response.ok) throw new Error("Failed to load game results");
      const data = await response.json();
      setResults(data.results ?? []);
    } catch {
      // keep last known results on a transient failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(
    async (owner: GameOwner, rawText: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, rawText }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to add game result");
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add game result");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/games/${id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) throw new Error("Failed to delete game result");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete game result");
      }
    },
    [refresh],
  );

  return { results, isLoading, isSubmitting, error, submit, remove, refresh };
}
