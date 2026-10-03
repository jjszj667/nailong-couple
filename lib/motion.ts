/** Presentation only: never derives or writes wallet / check-in state. */
export const motion = {
  fast: 160, normal: 320, slow: 560, cinematic: 900,
  stagger: 45, enter: "cubic-bezier(.16,1,.3,1)",
  spring: "cubic-bezier(.22,1.35,.36,1)",
} as const;
export function sceneForPath(path: string) {
  if (path.startsWith("/admin")) return "admin";
  if (/^\/(calendar|daily)/.test(path)) return "calendar";
  if (/^\/(shop|orders|wishes)/.test(path)) return "shop";
  if (path.startsWith("/story")) return "romance";
  if (/^\/(checkin|wallet)/.test(path)) return "sunshine";
  if (/^\/(profile|memories|places)/.test(path)) return "mint";
  return "home";
}
export function interpolateNumber(from: number, to: number, progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  return Math.round(from + (to - from) * (1 - (1 - t) ** 3));
}
