/**
 * Centralized localStorage access for connected apps.
 * Uses versioned key names and an index to avoid O(n) scans.
 *
 * Storage structure:
 * - v1_connected_apps_index: string[] (array of app IDs)
 * - v1_connected_app_<id>: ConnectedApp (individual app data)
 */

import { z } from 'zod';
import type { ConnectedApp } from '../types';

const STORAGE_VERSION = 'v1';
const CONNECTED_APP_PREFIX = `${STORAGE_VERSION}_connected_app_`;
const INDEX_KEY = `${STORAGE_VERSION}_connected_apps_index`;

/**
 * Legacy key prefix (unversioned) for migration purposes.
 */
const LEGACY_CONNECTED_APP_PREFIX = 'connected_app_';

/**
 * Zod schema for runtime validation of ConnectedApp.
 * Validates data read from localStorage to prevent corrupt data issues.
 */
const ConnectedAppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  permissions: z.array(z.string()),
  connectedAt: z.string(),
});

/**
 * Zod schema for the index array.
 */
const IndexSchema = z.array(z.string());

/**
 * Get the current index of app IDs from localStorage.
 */
function getIndex(): string[] {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = IndexSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/**
 * Set the index of app IDs in localStorage.
 */
function setIndex(ids: string[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

/**
 * Migrate legacy keys to versioned keys and build the index.
 * This should be called once during app initialization.
 * Safe to call multiple times (idempotent).
 */
export function migrateConnectedAppsStorage(): void {
  const existingIndex = getIndex();
  const migratedIds = new Set<string>(existingIndex);

  // First pass: collect all keys to migrate (don't mutate during iteration)
  const keysToMigrate: { legacyKey: string; value: string }[] = [];
  const storageKeys = Object.keys(localStorage);

  for (const key of storageKeys) {
    if (key.startsWith(LEGACY_CONNECTED_APP_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        keysToMigrate.push({ legacyKey: key, value });
      }
    }
  }

  // Second pass: perform migration
  for (const { legacyKey, value } of keysToMigrate) {
    try {
      const parsed = JSON.parse(value);
      const result = ConnectedAppSchema.safeParse(parsed);
      if (result.success) {
        const app = result.data;
        const versionedKey = `${CONNECTED_APP_PREFIX}${app.id}`;
        // Only migrate if versioned key doesn't exist
        if (!localStorage.getItem(versionedKey)) {
          localStorage.setItem(versionedKey, value);
        }
        migratedIds.add(app.id);
      }
      // Remove legacy key after migration attempt
      localStorage.removeItem(legacyKey);
    } catch {
      // Remove corrupt legacy keys
      localStorage.removeItem(legacyKey);
    }
  }

  // Also scan for versioned keys not in index (recovery)
  for (const key of storageKeys) {
    if (key.startsWith(CONNECTED_APP_PREFIX)) {
      const appId = key.slice(CONNECTED_APP_PREFIX.length);
      migratedIds.add(appId);
    }
  }

  // Update index with all discovered IDs
  setIndex([...migratedIds]);
}

/**
 * Get a connected app by its ID.
 * Returns null if not found or if data fails validation.
 */
export function getConnectedApp(appId: string): ConnectedApp | null {
  const key = `${CONNECTED_APP_PREFIX}${appId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const result = ConnectedAppSchema.safeParse(parsed);
    if (result.success) {
      return result.data as ConnectedApp;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set (create or update) a connected app.
 * Maintains the index for O(1) lookups.
 */
export function setConnectedApp(app: ConnectedApp): void {
  // Validate before storing
  const result = ConnectedAppSchema.safeParse(app);
  if (!result.success) {
    console.warn('setConnectedApp: Invalid app data', result.error.errors);
    return;
  }

  const key = `${CONNECTED_APP_PREFIX}${app.id}`;
  localStorage.setItem(key, JSON.stringify(app));

  // Update index
  const index = getIndex();
  if (!index.includes(app.id)) {
    setIndex([...index, app.id]);
  }
}

/**
 * Remove a connected app by its ID.
 * Updates the index to maintain consistency.
 */
export function removeConnectedApp(appId: string): void {
  localStorage.removeItem(`${CONNECTED_APP_PREFIX}${appId}`);
  // Also remove legacy key if it exists (for cleanup)
  localStorage.removeItem(`${LEGACY_CONNECTED_APP_PREFIX}${appId}`);

  // Update index
  const index = getIndex();
  const newIndex = index.filter((id) => id !== appId);
  setIndex(newIndex);
}

/**
 * Get all connected apps from localStorage.
 * Uses the index for O(1) lookup instead of scanning all keys.
 */
export function getAllConnectedApps(): ConnectedApp[] {
  const index = getIndex();
  const apps: ConnectedApp[] = [];

  for (const appId of index) {
    const app = getConnectedApp(appId);
    if (app) {
      apps.push(app);
    }
  }

  return apps;
}

/**
 * Check if an app is connected (exists in storage).
 */
export function isAppConnected(appId: string): boolean {
  return getConnectedApp(appId) !== null;
}
