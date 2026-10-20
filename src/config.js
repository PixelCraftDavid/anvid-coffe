export const cafe = {
  name: 'Anvid Coffe',
  demo: true,
  // Add the real Google Business review URL before running a live campaign.
  googleReviewUrl: '',
  storageKey: 'anvid-coffe-experience-v1',
};

export function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(cafe.storageKey) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function saveLocal(partial) {
  try {
    localStorage.setItem(cafe.storageKey, JSON.stringify({ ...readSaved(), ...partial }));
    return true;
  } catch { return false; }
}

// Preview results are local and have no redemption value. Real promotions need
// server-issued purchase tokens, atomic prize allocation and one-use redemption.
export function createPreviewPlay(forcedResult) {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const won = typeof forcedResult === 'boolean' ? forcedResult : values[0] / 2 ** 32 < 0.35;
  const play = { won, revealed: false, code: `DEMO-${values[1].toString(36).toUpperCase().padStart(7, '0')}`, createdAt: new Date().toISOString() };
  saveLocal({ play });
  return play;
}
