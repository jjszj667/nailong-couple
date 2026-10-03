/** Decorative only; never participates in user, wallet or check-in state. */
export const mobileCompanionPoses = ["dance", "balloon", "raincoat", "chef", "gardener", "stargaze"] as const;
export type MobileCompanionPose = typeof mobileCompanionPoses[number];
export function nextCompanionStep(step: number, length: number) {
  return length > 0 ? (step + 1) % length : 0;
}
export function companionCanAnimate(visible: boolean, hidden: boolean, reduced: boolean, paused: boolean) {
  return visible && !hidden && !reduced && !paused;
}
