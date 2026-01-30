/**
 * Centralized localStorage access for connected apps.
 * Uses versioned key names to support future schema migrations.
 */

import type { ConnectedApp } from '../types';

const STORAGE_VERSION = 'v1';
const CONNECTED_APP_PREFIX = `${STORAGE_VERSION}_connected_app_`;

/**
 * Legacy key prefix (unversioned) for migration purposes.
 */
const LEGACY_CONNECTED_APP_PREFIX = 'connected_app_';

/**
 * Get a connected app by its ID.
 * Falls back to legacy key if versioned key is not found.
 */
export function getConnectedApp(appId: string): ConnectedApp | null {
  // Try versioned key first
  const versionedKey = `${CONNECTED_APP_PREFIX}${appId}`;
  const versionedValue = localStorage.getItem(versionedKey);
  if (versionedValue) {
    try {
      return JSON.parse(versionedValue) as ConnectedApp;
    } catch {
      return null;
    }
  }

  // Fall back to legacy key and migrate if found
  const legacyKey = `${LEGACY_CONNECTED_APP_PREFIX}${appId}`;
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue) {
    try {
      const app = JSON.parse(legacyValue) as ConnectedApp;
      // Migrate to versioned key
      localStorage.setItem(versionedKey, legacyValue);
      localStorage.removeItem(legacyKey);
      return app;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Set (create or update) a connected app.
 */
export function setConnectedApp(app: ConnectedApp): void {
  const key = `${CONNECTED_APP_PREFIX}${app.id}`;
  localStorage.setItem(key, JSON.stringify(app));
}

/**
 * Remove a connected app by its ID.
 * Also removes legacy key if present.
 */
export function removeConnectedApp(appId: string): void {
  localStorage.removeItem(`${CONNECTED_APP_PREFIX}${appId}`);
  // Also remove legacy key if it exists
  localStorage.removeItem(`${LEGACY_CONNECTED_APP_PREFIX}${appId}`);
}

/**
 * Get all connected apps from localStorage.
 * Includes apps from both versioned and legacy keys (migrating legacy on read).
 */
export function getAllConnectedApps(): ConnectedApp[] {
  const apps: ConnectedApp[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Check versioned keys
    if (key.startsWith(CONNECTED_APP_PREFIX)) {
      try {
        const app = JSON.parse(localStorage.getItem(key) || '') as ConnectedApp;
        if (app.id && !seenIds.has(app.id)) {
          apps.push(app);
          seenIds.add(app.id);
        }
      } catch {
        // Skip invalid entries
      }
    }
    // Check legacy keys and migrate
    else if (key.startsWith(LEGACY_CONNECTED_APP_PREFIX)) {
      const appId = key.slice(LEGACY_CONNECTED_APP_PREFIX.length);
      if (seenIds.has(appId)) continue; // Already have this app from versioned key

      try {
        const value = localStorage.getItem(key) || '';
        const app = JSON.parse(value) as ConnectedApp;
        if (app.id && !seenIds.has(app.id)) {
          apps.push(app);
          seenIds.add(app.id);
          // Migrate to versioned key
          localStorage.setItem(`${CONNECTED_APP_PREFIX}${app.id}`, value);
          localStorage.removeItem(key);
        }
      } catch {
        // Skip invalid entries
      }
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
