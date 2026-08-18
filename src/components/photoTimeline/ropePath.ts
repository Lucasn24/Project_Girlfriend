export const ROPE_BAND_HEIGHT = 28;

const CENTER_Y = ROPE_BAND_HEIGHT / 2;
const PULL_AMPLITUDE = 11;
const WAVE_AMPLITUDE = 3;
const SAMPLE_STEP = 26;

export interface RopeAnchor {
  x: number;
  /** -1 pulls the rope up (toward a clip above), +1 pulls it down (toward a clip below). */
  pull: -1 | 1;
}

interface Point {
  x: number;
  y: number;
}

function catmullRomToBezier(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Builds a hand-hung-looking clothesline path: a gentle wave that dips toward each clip. */
export function buildRopePath(width: number, anchors: RopeAnchor[]): string {
  if (width <= 0) return "";

  const pullByX = new Map<number, number>();
  for (const anchor of anchors) {
    const x = Math.round(anchor.x);
    pullByX.set(x, (pullByX.get(x) ?? 0) + anchor.pull);
  }

  const xs = new Set<number>([0, Math.round(width)]);
  for (let x = 0; x <= width; x += SAMPLE_STEP) xs.add(Math.round(x));
  for (const x of pullByX.keys()) xs.add(x);

  const points = Array.from(xs)
    .sort((a, b) => a - b)
    .map((x) => {
      const wave = Math.sin((x / width) * Math.PI * 5) * WAVE_AMPLITUDE;
      const pull = pullByX.get(x);
      const y = CENTER_Y + wave + (pull ? Math.sign(pull) * PULL_AMPLITUDE : 0);
      return { x, y };
    });

  return catmullRomToBezier(points);
}
