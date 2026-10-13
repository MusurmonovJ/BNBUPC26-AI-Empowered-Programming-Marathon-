// Presentation time excludes hidden-tab intervals. Simulation time is still passed to the engine explicitly.
export function createPresentationClock(read: () => number) {
  let hiddenAt: number | null = null;
  let hiddenTotal = 0;
  return {
    now: () => (hiddenAt ?? read()) - hiddenTotal,
    hide: () => { if (hiddenAt === null) hiddenAt = read(); },
    show: () => {
      if (hiddenAt === null) return 0;
      const duration = read() - hiddenAt;
      hiddenTotal += duration;
      hiddenAt = null;
      return duration;
    },
  };
}
export const presentationClock = createPresentationClock(() => performance.now());
const resumeListeners = new Set<(duration: number) => void>();
export const onPresentationResume = (fn: (duration: number) => void) => {
  resumeListeners.add(fn);
  return () => { resumeListeners.delete(fn); };
};
if (typeof document !== 'undefined') {
  if (document.hidden) presentationClock.hide();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) presentationClock.hide();
    else {
      const duration = presentationClock.show();
      resumeListeners.forEach((fn) => fn(duration));
    }
  });
}
