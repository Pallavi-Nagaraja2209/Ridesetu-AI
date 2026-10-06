import { languages } from "./rideServices";
import type { Locale } from "./rideServices";

const STORAGE_KEYS = {
  locale: "ridesetu-locale",
  darkMode: "ridesetu-dark-mode",
  voiceSpeed: "ridesetu-voice-speed",
  displayName: "ridesetu-display-name",
} as const;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional; the app remains usable when storage is unavailable.
  }
}

export function getSavedLocale(): Locale {
  const savedLocale = readStorage(STORAGE_KEYS.locale);
  return languages.find((item) => item.code === savedLocale)?.code ?? "en";
}

export function saveLocale(locale: Locale) {
  writeStorage(STORAGE_KEYS.locale, locale);
}

export function getSavedDarkMode() {
  return readStorage(STORAGE_KEYS.darkMode) === "true";
}

export function saveDarkMode(enabled: boolean) {
  writeStorage(STORAGE_KEYS.darkMode, String(enabled));
}

export function getSavedVoiceSpeed() {
  const savedSpeed = Number(readStorage(STORAGE_KEYS.voiceSpeed));
  return savedSpeed === 0.8 || savedSpeed === 1 || savedSpeed === 1.2 ? savedSpeed : 1;
}

export function saveVoiceSpeed(speed: number) {
  if (speed === 0.8 || speed === 1 || speed === 1.2) {
    writeStorage(STORAGE_KEYS.voiceSpeed, String(speed));
  }
}

export function getSavedDisplayName() {
  const savedName = readStorage(STORAGE_KEYS.displayName)?.trim();
  return sanitizeDisplayName(savedName ?? "") || "Maya";
}

export function sanitizeDisplayName(name: string) {
  return name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 32);
}

export function saveDisplayName(name: string) {
  writeStorage(STORAGE_KEYS.displayName, sanitizeDisplayName(name));
}

export function clearSavedPreferences(): boolean {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
