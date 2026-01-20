import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import { setPlatforms, setConnectedPlatforms } from '../state/store';
import type { RootState } from '../state/store';
import type { Platform } from '../types';

export function usePlatforms() {
  const dispatch = useDispatch();
  const platforms = useSelector((state: RootState) => state.app.platforms);
  const connectedPlatforms = useSelector(
    (state: RootState) => state.app.connectedPlatforms
  );

  const loadPlatforms = useCallback(async () => {
    try {
      const loadedPlatforms = await invoke<Platform[]>('get_platforms');
      dispatch(setPlatforms(loadedPlatforms));

      // Check which platforms are connected
      const platformIds = loadedPlatforms.map((p) => p.id);
      const connected = await invoke<Record<string, boolean>>(
        'check_connected_platforms',
        { platformIds }
      );
      dispatch(setConnectedPlatforms(connected));
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  const refreshConnectedStatus = useCallback(async () => {
    if (platforms.length === 0) return;

    try {
      const platformIds = platforms.map((p) => p.id);
      const connected = await invoke<Record<string, boolean>>(
        'check_connected_platforms',
        { platformIds }
      );
      dispatch(setConnectedPlatforms(connected));
    } catch (error) {
      console.error('Failed to check connected platforms:', error);
    }
  }, [dispatch, platforms]);

  const getPlatformById = useCallback(
    (id: string) => {
      return platforms.find((p) => p.id === id);
    },
    [platforms]
  );

  const isPlatformConnected = useCallback(
    (id: string) => {
      return connectedPlatforms[id] || false;
    },
    [connectedPlatforms]
  );

  return {
    platforms,
    connectedPlatforms,
    loadPlatforms,
    refreshConnectedStatus,
    getPlatformById,
    isPlatformConnected,
  };
}
