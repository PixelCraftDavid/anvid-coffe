// Short, movement-driven pulses; no repeating timer can outlive a gesture.
export function createExperienceHaptics({
  device = globalThis.navigator,
  now = () => performance.now(),
  isVisible = () => !document.hidden,
  enabled = true,
} = {}) {
  const supported = typeof device?.vibrate === 'function';
  let allowed = enabled;
  let owner = null;
  let lastPulse = -Infinity;
  let travelled = 0;
  let pendingWin = null;

  function vibrate(pattern) {
    if (!supported) return false;
    try { return device.vibrate(pattern) !== false; }
    catch { return false; }
  }

  function stopScratch() {
    travelled = 0;
    lastPulse = -Infinity;
    // React removes the scratch surface after reveal. Its cleanup must never
    // cancel the winning pattern, which now owns the same device actuator.
    if (owner === 'scratch') { vibrate(0); owner = null; }
  }

  function stop() {
    if (owner) vibrate(0);
    owner = null;
    travelled = 0;
    lastPulse = -Infinity;
    pendingWin = null;
  }

  return {
    supported,
    setEnabled(value) { allowed = !!value; if (!allowed) stop(); },
    scratch({ distance, speed, pointerType }) {
      if (!supported || !allowed || !isVisible() || device.userActivation?.hasBeenActive === false || pointerType !== 'touch' || owner === 'win') return;
      if (!Number.isFinite(distance) || !Number.isFinite(speed) || distance < .45 || speed < 20) return;
      travelled += distance;
      const time = now();
      if (travelled < 7 || time - lastPulse < 90) return;
      // Duration, rather than amplitude, is the control the web API exposes.
      if (vibrate(speed > 650 ? 12 : 8)) owner = 'scratch';
      lastPulse = time;
      travelled = 0;
    },
    win({ reducedMotion = false } = {}) {
      stop();
      if (!supported || !allowed || !isVisible()) return;
      const pattern = reducedMotion ? 15 : [20, 65, 25, 105, 55];
      // On a first touch, some browsers grant activation only on pointerup.
      // Keep that win briefly, then deliver it from the real release gesture.
      if (device.userActivation?.hasBeenActive === false) pendingWin = { pattern, until: now() + 1200 };
      else if (vibrate(pattern)) owner = 'win';
    },
    resumePendingWin() {
      const pending = pendingWin;
      pendingWin = null;
      if (pending && allowed && isVisible() && now() <= pending.until && device.userActivation?.hasBeenActive !== false && vibrate(pending.pattern)) owner = 'win';
    },
    stopScratch,
    stop,
  };
}
