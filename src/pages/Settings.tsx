import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import {
  Database,
  Info,
  Shield,
  Monitor,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { ConnectedApp } from '../types';
import { SettingsAccount, SettingsApps, SettingsStorage, SettingsAbout } from './settings-sections';

interface NodeJsTestResult {
  nodejs: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: string;
  uptime: string;
}

type SettingsSection = 'account' | 'apps' | 'storage' | 'about';

export function Settings() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [dataPath, setDataPath] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');
  const [nodeTestStatus, setNodeTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [nodeTestResult, setNodeTestResult] = useState<NodeJsTestResult | null>(null);
  const [nodeTestError, setNodeTestError] = useState<string | null>(null);
  const [pathsDebug, setPathsDebug] = useState<Record<string, unknown> | null>(null);
  const [browserStatus, setBrowserStatus] = useState<{ available: boolean; browser_type: string } | null>(null);
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);

  useEffect(() => {
    invoke<string>('get_user_data_path').then((path) => {
      setDataPath(path);
    });
    getVersion().then((version) => {
      setAppVersion(version);
    });

    // Load connected apps from localStorage
    const apps: ConnectedApp[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('connected_app_')) {
        try {
          const app = JSON.parse(localStorage.getItem(key) || '');
          apps.push(app);
        } catch {
          // Skip invalid entries
        }
      }
    }
    setConnectedApps(apps);
  }, []);

  const openDataFolder = useCallback(async () => {
    try {
      await invoke('open_folder', { path: dataPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [dataPath]);

  const testNodeJs = useCallback(async () => {
    setNodeTestStatus('testing');
    setNodeTestResult(null);
    setNodeTestError(null);
    try {
      const result = await invoke<NodeJsTestResult>('test_nodejs');
      setNodeTestResult(result);
      setNodeTestStatus('success');
    } catch (error) {
      setNodeTestError(String(error));
      setNodeTestStatus('error');
    }
  }, []);

  const debugPaths = useCallback(async () => {
    try {
      const result = await invoke<Record<string, unknown>>('debug_connector_paths');
      setPathsDebug(result);
    } catch (error) {
      console.error('Debug paths error:', error);
    }
  }, []);

  const checkBrowserStatus = useCallback(async () => {
    try {
      const result = await invoke<{ available: boolean; browser_type: string; needs_download: boolean }>(
        'check_browser_available'
      );
      setBrowserStatus(result);
    } catch (error) {
      console.error('Browser check error:', error);
    }
  }, []);

  useEffect(() => {
    checkBrowserStatus();
  }, [checkBrowserStatus]);

  const handleRevokeApp = useCallback(
    (appId: string) => {
      localStorage.removeItem(`connected_app_${appId}`);
      setConnectedApps((prev) => prev.filter((app) => app.id !== appId));
    },
    []
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  const sections: Array<{ key: SettingsSection; label: string; icon: React.ReactNode }> = [
    { key: 'account', label: 'Account', icon: <Monitor style={{ width: '18px', height: '18px' }} /> },
    { key: 'apps', label: 'Authorised Apps', icon: <Shield style={{ width: '18px', height: '18px' }} /> },
    { key: 'storage', label: 'Storage & Server', icon: <Database style={{ width: '18px', height: '18px' }} /> },
    { key: 'about', label: 'About & Diagnostics', icon: <Info style={{ width: '18px', height: '18px' }} /> },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
          Manage your preferences
        </p>

        {/* Layout with sidebar */}
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Sidebar */}
          <aside style={{ width: '200px', flexShrink: 0 }}>
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'sticky',
                top: '24px',
              }}
            >
              {sections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: activeSection === section.key ? '#1a1a1a' : '#6b7280',
                    backgroundColor: activeSection === section.key ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== section.key) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== section.key) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {activeSection === 'account' && (
              <SettingsAccount
                user={user}
                isAuthenticated={isAuthenticated}
                onLogout={handleLogout}
              />
            )}

            {activeSection === 'apps' && (
              <SettingsApps
                connectedApps={connectedApps}
                onRevokeApp={handleRevokeApp}
              />
            )}

            {activeSection === 'storage' && (
              <SettingsStorage
                dataPath={dataPath}
                onOpenDataFolder={openDataFolder}
              />
            )}

            {activeSection === 'about' && (
              <SettingsAbout
                appVersion={appVersion}
                nodeTestStatus={nodeTestStatus}
                nodeTestResult={nodeTestResult}
                nodeTestError={nodeTestError}
                browserStatus={browserStatus}
                pathsDebug={pathsDebug}
                onTestNodeJs={testNodeJs}
                onCheckBrowserStatus={checkBrowserStatus}
                onDebugPaths={debugPaths}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
