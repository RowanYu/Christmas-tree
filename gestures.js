const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Classify a MediaPipe Hands 21-point set. Pinch distances are normalized by palm width. */
export function classifyHand(points, pinchActive = false) {
  const palmWidth = Math.max(distance2D(points[5], points[17]), 0.045);
  let extended = 0;
  for (const [tip, pip] of [[8, 6], [12, 10], [16, 14], [20, 18]]) {
    if (distance2D(points[tip], points[0]) > distance2D(points[pip], points[0]) * 1.12) extended++;
  }
  if (distance2D(points[4], points[0]) > distance2D(points[3], points[0]) * 1.12) extended++;

  // Check a fist first: its curled fingertips can otherwise resemble a pinch.
  if (extended <= 1) return 'fist';
  const nearestPinch = Math.min(distance2D(points[4], points[8]), distance2D(points[4], points[12])) / palmWidth;
  const pinchLimit = pinchActive ? 0.46 : 0.31;
  if (nearestPinch < pinchLimit) return 'pinch';
  if (extended >= 4) return 'open';
  return 'neutral';
}

/** Record one frame and return movement intent before the caller routes a pinch. */
export function trackHandMotion(points, gesture, trail, now) {
  const x = 1 - points[9].x;
  const y = points[9].y;
  trail.push({ x, y, time: now, gesture });
  while (trail.length && now - trail[0].time > 520) trail.shift();

  const recent = trail.filter(sample => now - sample.time <= 200);
  const recentFirst = recent[0] || trail.at(-1);
  const fastDx = x - recentFirst.x;
  const fastDy = y - recentFirst.y;
  const first = trail[0];
  const dx = x - first.x;
  const dy = y - first.y;
  const elapsed = first ? now - first.time : 0;
  const fastHorizontal = recent.length >= 2 && Math.abs(fastDx) >= 0.10
    && Math.abs(fastDy) < 0.22 && Math.abs(dy) < 0.22;
  // This is only a pinch/photo guard. Do not apply swipe's vertical gate here:
  // every valid full swipe must cross this horizontal threshold before it can rotate.
  const horizontalIntent = trail.length >= 2 && Math.abs(dx) >= 0.10;
  const swiped = trail.length >= 4 && Math.abs(dx) >= 0.22 && Math.abs(dy) < 0.22
    && elapsed >= 100 && elapsed < 520 && gesture !== 'fist';
  return { fastHorizontal, horizontalIntent, swiped, direction: dx > 0 ? 1 : -1 };
}

/** Two-frame pinch entry with a latched active state and immediate release. */
export function advancePinch(active, frames, detected, blocked = false) {
  if (blocked || !detected) return { active: false, frames: 0, entered: false, released: active };
  const nextFrames = active ? frames : frames + 1;
  const nextActive = active || nextFrames >= 2;
  return { active: nextActive, frames: nextFrames, entered: !active && nextActive, released: false };
}
