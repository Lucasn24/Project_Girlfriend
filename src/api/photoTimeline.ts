import type { PhotoTimelineEntry, PhotoTimelineOwner } from "../types";

export interface PhotoTimelineUploadInput {
  owner: PhotoTimelineOwner;
  timestamp: string;
  caption?: string;
  file: Blob;
}

export interface PhotoTimelinePatchInput {
  timestamp?: string;
  caption?: string | null;
}

export async function fetchPhotosInRange(start: Date, end: Date): Promise<PhotoTimelineEntry[]> {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  const response = await fetch(`/api/photo-timeline/entries?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load photos");
  const data = await response.json();
  return data.photos ?? [];
}

export async function uploadPhoto(input: PhotoTimelineUploadInput): Promise<PhotoTimelineEntry> {
  const formData = new FormData();
  formData.append("owner", input.owner);
  formData.append("timestamp", input.timestamp);
  if (input.caption) formData.append("caption", input.caption);
  formData.append("photo", input.file, "photo.jpg");

  const response = await fetch("/api/photo-timeline/entries", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to upload photo");
  return data.photo;
}

export async function updatePhoto(id: string, patch: PhotoTimelinePatchInput): Promise<PhotoTimelineEntry> {
  const response = await fetch(`/api/photo-timeline/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to update photo");
  return data.photo;
}

export async function deletePhoto(id: string): Promise<void> {
  const response = await fetch(`/api/photo-timeline/entries/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error("Failed to delete photo");
}
