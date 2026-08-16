import { useCallback, useEffect, useState } from "react";
import type { CouplePhotoState } from "../types";

const EMPTY_STATE: CouplePhotoState = {
  userPhotoUrl: null,
  partnerPhotoUrl: null,
  generatedUrl: null,
  generatedAt: null,
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function useCouplePhoto() {
  const [state, setState] = useState<CouplePhotoState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/couple-photo");
      if (!response.ok) throw new Error("Failed to load couple photo");
      setState(await response.json());
    } catch {
      // keep last known state on a transient failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(async (userFile: File, partnerFile: File, styleNote?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const [userImageData, partnerImageData] = await Promise.all([
        readFileAsBase64(userFile),
        readFileAsBase64(partnerFile),
      ]);

      const response = await fetch("/api/couple-photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userImage: { data: userImageData, mimeType: userFile.type },
          partnerImage: { data: partnerImageData, mimeType: partnerFile.type },
          styleNote: styleNote?.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to generate couple photo");
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate couple photo");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { state, isLoading, isGenerating, error, generate, refresh };
}
