// Generic, typed LocalStorage helpers. All other data modules build on top of
// this file instead of calling localStorage.getItem/setItem directly.

export const STORAGE_KEYS = {
  customers: "customers",
  customerTypes: "customerTypes",
  appointments: "appointments",
  customerNotes: "customerNotes",
  reminders: "reminders",
  notifications: "notifications",
  settings: "settings",
} as const;

export function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeList<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`تعذر حفظ البيانات (${key}) في LocalStorage`, err);
  }
}

export function readObject<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function writeObject<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`تعذر حفظ البيانات (${key}) في LocalStorage`, err);
  }
}

// Ensures every known key has at least an empty array so the rest of the app
// never has to special-case "undefined". Called once on app startup.
export function initStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key === STORAGE_KEYS.settings) return;
    if (localStorage.getItem(key) === null) writeList(key, []);
  });
}

// Wipes every CRM key from this browser's LocalStorage. Used by "مسح جميع البيانات".
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  initStorage();
}
