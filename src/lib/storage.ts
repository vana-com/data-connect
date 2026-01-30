/**
 * Centralized localStorage access for connected apps.
 * Uses versioned key names and an index to avoid O(n) scans.
 *
 * Storage strategy: per-key + index
 * - Each connected app is stored as a separate key (v1_connected_app_<id>)
 * - An index key (v1_connected_apps_index) lists all app IDs
 * - This approach was chosen over single-blob storage (v2) for:
 *   1. Better quota resilience (partial writes possible)
 *   2. Simpler conflict resolution (no merge needed)
 *   3. O(1) single-app lookups
 *
 * All writes are hardened against quota/blocked failures (fail soft, log).
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

const connectedAppListeners = new Set<() => void>();
let connectedAppsSnapshotVersion = 0;
let connectedAppsCacheVersion = -1;
let connectedAppsCache: ConnectedApp[] = [];

function notifyConnectedAppsChange(): void {
  connectedAppsSnapshotVersion += 1;
  for (const listener of connectedAppListeners) {
    listener();
  }
}

/**
 * Safe localStorage write that handles quota/blocked failures.
 * Returns true if write succeeded, false otherwise.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError or SecurityError (blocked storage)
    console.warn(`storage: failed to write ${key}`, error);
    return false;
  }
}

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
 * Returns true if write succeeded, false otherwise.
 */
function setIndex(ids: string[]): boolean {
  return safeSetItem(INDEX_KEY, JSON.stringify(ids));
}

/**
 * Migrate legacy keys to versioned keys and build the index.
 * This should be called once during app initialization.
 * Safe to call multiple times (idempotent).
 * Fails soft on quota/blocked storage (logs warning, skips failed items).
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
          const writeSucceeded = safeSetItem(versionedKey, value);
          if (!writeSucceeded) {
            // Skip this item but continue migration for others
            continue;
          }
        }
        migratedIds.add(app.id);
        // Remove legacy key after successful migration
        localStorage.removeItem(legacyKey);
      } else {
        console.warn('migrateConnectedAppsStorage: invalid legacy connected app, keeping key', legacyKey);
      }
    } catch (error) {
      console.warn('migrateConnectedAppsStorage: failed to parse legacy connected app, keeping key', legacyKey, error);
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
  if (setIndex([...migratedIds])) {
    notifyConnectedAppsChange();
  }
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
 * Fails soft on quota/blocked storage (logs warning, no-ops).
 */
export function setConnectedApp(app: ConnectedApp): void {
  // Validate before storing
  const result = ConnectedAppSchema.safeParse(app);
  if (!result.success) {
    console.warn('setConnectedApp: Invalid app data', result.error.errors);
    return;
  }

  const key = `${CONNECTED_APP_PREFIX}${app.id}`;
  const writeSucceeded = safeSetItem(key, JSON.stringify(app));
  if (!writeSucceeded) {
    // Skip index update and notification if write failed
    return;
  }

  // Update index
  const index = getIndex();
  if (!index.includes(app.id)) {
    const indexWriteSucceeded = setIndex([...index, app.id]);
    if (!indexWriteSucceeded) {
      localStorage.removeItem(key);
      return;
    }
  }

  notifyConnectedAppsChange();
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

  notifyConnectedAppsChange();
}

/**
 * Get all connected apps from localStorage.
 * Uses the index for O(1) lookup instead of scanning all keys.
 */
export function getAllConnectedApps(): ConnectedApp[] {
  if (connectedAppsCacheVersion === connectedAppsSnapshotVersion) {
    return connectedAppsCache;
  }

  const index = getIndex();
  const apps: ConnectedApp[] = [];

  for (const appId of index) {
    const app = getConnectedApp(appId);
    if (app) {
      apps.push(app);
    }
  }

  connectedAppsCache = apps;
  connectedAppsCacheVersion = connectedAppsSnapshotVersion;
  return apps;
}

/**
 * Subscribe to connected apps changes.
 */
export function subscribeConnectedApps(callback: () => void): () => void {
  connectedAppListeners.add(callback);

  return () => {
    connectedAppListeners.delete(callback);
  };
}

/**
 * Check if an app is connected (exists in storage).
 */
export function isAppConnected(appId: string): boolean {
  return getConnectedApp(appId) !== null;
}
