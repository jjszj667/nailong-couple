/** Original sunny coin, orbit and four-point sparkle. No external artwork. */
export function NiwaMotif({ kind = "spark", className = "" }: { kind?: "spark" | "coin" | "orbit"; className?: string }) {
  return <svg viewBox="0 0 80 80" className={className} aria-hidden="true" fill="none">
    {kind === "spark" ? <path d="M40 7Q45 33 73 40Q45 46 40 73Q34 46 7 40Q34 33 40 7Z" fill="currentColor" /> : kind === "coin" ? <><circle cx="40" cy="40" r="33" fill="#FFE07B" stroke="#DA9500" strokeWidth="3" /><circle cx="40" cy="40" r="25" stroke="#FFF7D5" strokeWidth="3" /><path d="M28 36Q28 25 37 30L40 34L43 30Q52 25 52 36Q52 44 40 51Q28 44 28 36Z" fill="#AD6A04" /><path d="M19 22L24 17M55 62L60 57" stroke="#FFF7D5" strokeWidth="3" strokeLinecap="round" /></> : <><ellipse cx="40" cy="40" rx="34" ry="23" stroke="currentColor" strokeWidth="2" transform="rotate(-25 40 40)" /><circle cx="68" cy="22" r="7" fill="currentColor" /><circle cx="17" cy="58" r="4" fill="currentColor" /></>}
  </svg>;
}
