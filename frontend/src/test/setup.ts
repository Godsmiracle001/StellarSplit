import '@testing-library/jest-dom';

import "../i18n/config";

// Ensure a stable Storage implementation across jsdom/happy-dom.
// Some environments provide a partial localStorage without `clear()`.
const memoryStorage = () => {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (
  typeof globalThis.localStorage === "undefined" ||
  typeof (globalThis.localStorage as any).clear !== "function"
) {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    memoryStorage() as unknown as Storage;
}

