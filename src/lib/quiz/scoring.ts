/** Speed bonus: correct answers earn between 50% and 100% of base points. */
export function calcPointsEarned(
  basePoints: number,
  remainingMs: number,
  timeLimitMs: number
): number {
  if (timeLimitMs <= 0) return basePoints;
  const clamped = Math.max(0, Math.min(remainingMs, timeLimitMs));
  return Math.floor(basePoints * (0.5 + 0.5 * (clamped / timeLimitMs)));
}
