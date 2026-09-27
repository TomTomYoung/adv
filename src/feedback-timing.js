// Both adapters count from the same render start, even if rebuilding the view is slow.
// Unstamped standalone previews retain their relative timing.
export function feedbackDelay(feedback,at,now=globalThis.performance.now()){
  const elapsed=Number.isFinite(feedback.startedAt)?Math.max(0,now-feedback.startedAt):0;
  return Math.max(0,at-elapsed);
}
