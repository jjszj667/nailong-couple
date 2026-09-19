export function makeupReward(normalReward: number, priorMakeups: number) {
  return priorMakeups === 0 ? Math.floor(normalReward / 2) : 0;
}

export function missedPenalty(streak: number, available: number) {
  const planned = streak <= 1 ? 0 : streak === 2 ? 3 : streak === 3 ? 4 : 5;
  return { planned, actual: Math.min(Math.max(available, 0), planned) };
}

export function completedByNormal(checkinKinds: readonly string[]) {
  return checkinKinds.includes("normal");
}
