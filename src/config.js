export const cafe = {
  name: 'Anvid Coffe',
  timeZone: 'Etc/GMT+6',
  timeZoneLabel: 'UTC−6',
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
