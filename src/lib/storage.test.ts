import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectedApp } from '../types';

type StorageModule = typeof import('./storage');

let storage: StorageModule;

const indexKey = 'v1_connected_apps_index';
const appKey = (id: string) => `v1_connected_app_${id}`;
const legacyKey = (id: string) => `connected_app_${id}`;

const baseApp: ConnectedApp = {
  id: 'app-1',
  name: 'App One',
  permissions: ['read'],
  connectedAt: '2024-01-01T00:00:00Z',
};

const readIndex = (): string[] | null => {
  const raw = localStorage.getItem(indexKey);
  if (!raw) return null;
  return JSON.parse(raw) as string[];
};

/**
 * Helper: intercept localStorage.setItem with a custom gate function.
 * Spies on the instance method (not Storage.prototype) to work around
 * happy-dom's ClassMethodBinder caching bound methods on the instance.
 * Returns a restore function that MUST be called before the test ends.
 */
function interceptSetItem(
  gate: (key: string, value: string) => 'throw' | 'passthrough'
) {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(
    (key: string, value: string) => {
      if (gate(key, value) === 'throw') {
        throw new Error('boom');
      }
      return originalSetItem(key, value);
    }
  );
  return {
    spy,
    restore() {
      spy.mockRestore();
    },
  };
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  storage = await import('./storage');
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('setConnectedApp', () => {
  it('warns and skips invalid app data', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.setConnectedApp({ ...baseApp, id: '' });

    expect(warnSpy).toHaveBeenCalled();
    expect(localStorage.getItem(appKey(''))).toBeNull();
    expect(readIndex()).toBeNull();
  });

  it('skips index update and notify when write fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    const unsubscribe = storage.subscribeConnectedApps(listener);

    const { restore } = interceptSetItem((key) =>
      key === appKey(baseApp.id) ? 'throw' : 'passthrough'
    );

    storage.setConnectedApp(baseApp);
    unsubscribe();
    restore();

    expect(warnSpy).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(localStorage.getItem(appKey(baseApp.id))).toBeNull();
    expect(readIndex()).toBeNull();
  });

  it('rolls back app write when index update fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    const unsubscribe = storage.subscribeConnectedApps(listener);

    const { restore } = interceptSetItem((key) =>
      key === indexKey ? 'throw' : 'passthrough'
    );

    storage.setConnectedApp(baseApp);
    unsubscribe();
    restore();

    expect(warnSpy).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(localStorage.getItem(appKey(baseApp.id))).toBeNull();
    expect(readIndex()).toBeNull();
  });

  it('stores app, updates index, and notifies listeners on success', () => {
    const listener = vi.fn();
    const unsubscribe = storage.subscribeConnectedApps(listener);

    storage.setConnectedApp(baseApp);
    unsubscribe();

    expect(JSON.parse(localStorage.getItem(appKey(baseApp.id)) ?? '')).toEqual(baseApp);
    expect(readIndex()).toEqual([baseApp.id]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('removeConnectedApp', () => {
  it('removes app keys and updates the index', () => {
    storage.setConnectedApp(baseApp);
    localStorage.setItem(legacyKey(baseApp.id), JSON.stringify(baseApp));

    const listener = vi.fn();
    const unsubscribe = storage.subscribeConnectedApps(listener);

    storage.removeConnectedApp(baseApp.id);
    unsubscribe();

    expect(localStorage.getItem(appKey(baseApp.id))).toBeNull();
    expect(localStorage.getItem(legacyKey(baseApp.id))).toBeNull();
    expect(readIndex()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('migrateConnectedAppsStorage', () => {
  it('migrates legacy keys, builds index, and skips failures', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyApp = { ...baseApp, id: 'legacy-1', name: 'Legacy One' };
    const legacyFail = { ...baseApp, id: 'legacy-2', name: 'Legacy Two' };
    const existingApp = { ...baseApp, id: 'existing', name: 'Existing App' };

    localStorage.setItem(legacyKey('legacy-1'), JSON.stringify(legacyApp));
    localStorage.setItem(legacyKey('legacy-2'), JSON.stringify(legacyFail));
    localStorage.setItem(legacyKey('bad-json'), '{not json');
    localStorage.setItem(
      legacyKey('bad-schema'),
      JSON.stringify({ id: '', name: '', permissions: [], connectedAt: '' })
    );
    localStorage.setItem(appKey('existing'), JSON.stringify(existingApp));

    const { restore } = interceptSetItem((key) =>
      key === appKey('legacy-2') ? 'throw' : 'passthrough'
    );

    const listener = vi.fn();
    const unsubscribe = storage.subscribeConnectedApps(listener);

    storage.migrateConnectedAppsStorage();
    unsubscribe();
    restore();

    expect(localStorage.getItem(legacyKey('legacy-1'))).toBeNull();
    expect(localStorage.getItem(appKey('legacy-1'))).not.toBeNull();
    expect(localStorage.getItem(legacyKey('legacy-2'))).not.toBeNull();
    expect(localStorage.getItem(appKey('legacy-2'))).toBeNull();
    expect(localStorage.getItem(legacyKey('bad-json'))).not.toBeNull();
    expect(localStorage.getItem(legacyKey('bad-schema'))).not.toBeNull();
    expect(readIndex()?.sort()).toEqual(['existing', 'legacy-1'].sort());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('getConnectedApp', () => {
  it('returns null for invalid stored data', () => {
    localStorage.setItem(
      appKey(baseApp.id),
      JSON.stringify({ ...baseApp, id: '' })
    );

    expect(storage.getConnectedApp(baseApp.id)).toBeNull();
  });
});

describe('getAllConnectedApps', () => {
  it('skips invalid entries and returns valid apps only', () => {
    const appA = { ...baseApp, id: 'a', name: 'App A' };

    localStorage.setItem(indexKey, JSON.stringify(['a', 'b']));
    localStorage.setItem(appKey('a'), JSON.stringify(appA));
    localStorage.setItem(
      appKey('b'),
      JSON.stringify({ id: '', name: '', permissions: [], connectedAt: '' })
    );

    expect(storage.getAllConnectedApps()).toEqual([appA]);
  });

  it('refreshes cached list after updates', () => {
    storage.setConnectedApp(baseApp);
    expect(storage.getAllConnectedApps().map((app) => app.id)).toEqual([baseApp.id]);

    storage.setConnectedApp({ ...baseApp, id: 'app-2', name: 'App Two' });
    expect(storage.getAllConnectedApps().map((app) => app.id)).toEqual([
      baseApp.id,
      'app-2',
    ]);
  });
});
