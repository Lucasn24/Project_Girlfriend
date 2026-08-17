const MAX_TILT_DEG = 6;

/** Deterministic per-photo tilt in [-MAX_TILT_DEG, MAX_TILT_DEG], stable across re-renders. */
export function seededTiltDeg(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000; // 0..1
  return normalized * MAX_TILT_DEG * 2 - MAX_TILT_DEG;
}
