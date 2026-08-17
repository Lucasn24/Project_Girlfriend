import { useCallback, useEffect, useState } from "react";
import {
  deletePhoto as deletePhotoApi,
  fetchPhotosInRange,
  updatePhoto as updatePhotoApi,
  uploadPhoto as uploadPhotoApi,
  type PhotoTimelinePatchInput,
  type PhotoTimelineUploadInput,
} from "../../api/photoTimeline";
import type { PhotoTimelineEntry } from "../../types";

export function usePhotoTimeline(start: Date, end: Date) {
  const [photos, setPhotos] = useState<PhotoTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const refetch = useCallback(async () => {
    try {
      setPhotos(await fetchPhotosInRange(new Date(startIso), new Date(endIso)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setIsLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  const uploadPhoto = useCallback(
    async (input: PhotoTimelineUploadInput) => {
      setMutationError(null);
      try {
        await uploadPhotoApi(input);
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to upload photo");
        return false;
      }
    },
    [refetch],
  );

  const updatePhoto = useCallback(
    async (id: string, patch: PhotoTimelinePatchInput) => {
      setMutationError(null);
      try {
        await updatePhotoApi(id, patch);
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to update photo");
        return false;
      }
    },
    [refetch],
  );

  const deletePhoto = useCallback(
    async (id: string) => {
      setMutationError(null);
      try {
        await deletePhotoApi(id);
        await refetch();
        return true;
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Failed to delete photo");
        return false;
      }
    },
    [refetch],
  );

  return { photos, isLoading, error, mutationError, refetch, uploadPhoto, updatePhoto, deletePhoto };
}
