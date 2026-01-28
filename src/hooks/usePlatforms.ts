import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import { setPlatforms, setConnectedPlatforms } from '../state/store';
import type { RootState } from '../state/store';
import type { Platform } from '../types';

// Mock platforms for browser-only dev mode
const MOCK_PLATFORMS: Platform[] = [
  {
    id: 'chatgpt-playwright',
    company: 'OpenAI',
    name: 'ChatGPT',
    filename: 'chatgpt-playwright',
    description: 'Exports your email and memories from ChatGPT using Playwright browser automation.',
    isUpdated: false,
    logoURL: 'chatgpt-playwright',
    needsConnection: true,
    connectURL: 'https://chatgpt.com/',
    connectSelector: "nav a[href^='/c/']",
    exportFrequency: 'daily',
    vectorize_config: { documents: 'content' },
    runtime: 'playwright',
  },
  {
    id: 'instagram-playwright',
    company: 'Meta',
    name: 'Instagram',
    filename: 'instagram-playwright',
    description: 'Exports your Instagram profile and posts using Playwright browser automation.',
    isUpdated: false,
    logoURL: 'instagram-playwright',
    needsConnection: true,
    connectURL: 'https://www.instagram.com/accounts/login/',
    connectSelector: "svg[aria-label='Home'], a[href='/direct/inbox/']",
    exportFrequency: 'daily',
    vectorize_config: { documents: 'caption' },
    runtime: 'playwright',
  },
  {
    id: 'linkedin-playwright',
    company: 'LinkedIn',
    name: 'LinkedIn',
    filename: 'linkedin-playwright',
    description: 'Exports your LinkedIn profile including experience, education, and skills using Playwright browser automation.',
    isUpdated: false,
    logoURL: 'linkedin-playwright',
    needsConnection: true,
    connectURL: 'https://www.linkedin.com/login',
    connectSelector: "a[href*='/feed/'], .feed-identity-module, .global-nav__me",
    exportFrequency: 'weekly',
    vectorize_config: { documents: 'experience' },
    runtime: 'playwright',
  },
];

// Check if running in browser-only dev mode (no Tauri backend)
const isDevMode = () => {
  return (
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') &&
    !(window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
};

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
      // Fallback to mock data in dev mode
      if (isDevMode()) {
        console.log('Dev mode: using mock platforms');
        dispatch(setPlatforms(MOCK_PLATFORMS));
        dispatch(setConnectedPlatforms({}));
      }
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
