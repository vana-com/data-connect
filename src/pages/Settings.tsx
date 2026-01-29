import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import {
  FolderOpen,
  ExternalLink,
  Database,
  Info,
  Play,
  CheckCircle,
  XCircle,
  Loader,
  Shield,
  LogOut,
  Monitor,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { ConnectedApp } from '../types';

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

  const openDataFolder = async () => {
    try {
      await invoke('open_folder', { path: dataPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const testNodeJs = async () => {
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
  };

  const debugPaths = async () => {
    try {
      const result = await invoke<Record<string, unknown>>('debug_connector_paths');
      setPathsDebug(result);
    } catch (error) {
      console.error('Debug paths error:', error);
    }
  };

  const checkBrowserStatus = async () => {
    try {
      const result = await invoke<{ available: boolean; browser_type: string; needs_download: boolean }>(
        'check_browser_available'
      );
      setBrowserStatus(result);
    } catch (error) {
      console.error('Browser check error:', error);
    }
  };

  useEffect(() => {
    checkBrowserStatus();
  }, []);

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

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
  };

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
            {/* Account Section */}
            {activeSection === 'account' && (
              <div>
                {/* Local-only banner */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <Database style={{ width: '20px', height: '20px', color: '#6366f1', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '2px' }}>
                      Local-only storage enabled
                    </div>
                    <div style={{ fontSize: '13px', color: '#6366f1' }}>
                      Your data never leaves this device unless you explicitly export it.
                    </div>
                  </div>
                </div>

                {/* Sessions */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Sessions
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#dcfce7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Monitor style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Current device</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>This computer</div>
                      </div>
                      <span
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#22c55e',
                          backgroundColor: '#dcfce7',
                          borderRadius: '4px',
                        }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                </section>

                {/* Account */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Account
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Shield style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Email</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {user?.email || 'Not signed in'}
                        </div>
                      </div>
                    </div>
                    {isAuthenticated && (
                      <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                        <button
                          onClick={handleLogout}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#ef4444',
                            backgroundColor: 'transparent',
                            border: '1px solid #fee2e2',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <LogOut style={{ width: '16px', height: '16px' }} />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Authorised Apps Section */}
            {activeSection === 'apps' && (
              <div>
                <section>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Connected applications
                  </h2>
                  {connectedApps.length === 0 ? (
                    <div
                      style={{
                        ...cardStyle,
                        padding: '48px',
                        textAlign: 'center',
                      }}
                    >
                      <Shield
                        style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }}
                      />
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                        No connected apps
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
                        Apps that you authorise to access your data will appear here
                      </p>
                    </div>
                  ) : (
                    <div style={cardStyle}>
                      {connectedApps.map((app) => (
                        <div
                          key={app.id}
                          style={{
                            ...rowStyle,
                            ...(connectedApps.indexOf(app) < connectedApps.length - 1
                              ? { borderBottom: '1px solid #f3f4f6' }
                              : {}),
                            gap: '16px',
                          }}
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              flexShrink: 0,
                            }}
                          >
                            {app.icon || '🔗'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                              {app.name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {app.permissions.length > 0 ? app.permissions.join(', ') : 'Full access'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeApp(app.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              fontSize: '13px',
                              color: '#ef4444',
                              backgroundColor: 'transparent',
                              border: '1px solid #fee2e2',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Storage & Server Section */}
            {activeSection === 'storage' && (
              <div>
                {/* Local Data */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Local Data
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#eef2ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Export location</div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dataPath}
                        </div>
                      </div>
                      <button
                        onClick={openDataFolder}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#4b5563',
                          backgroundColor: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <FolderOpen style={{ width: '16px', height: '16px' }} />
                        Open
                      </button>
                    </div>
                  </div>
                </section>

                {/* Storage Provider */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Storage
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#eef2ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Local Storage</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>Selected</div>
                      </div>
                      <CheckCircle style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    </div>
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Vana Storage</div>
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
                      </div>
                    </div>
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Google Drive</div>
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
                      </div>
                    </div>
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Dropbox</div>
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Server */}
                <section>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Server
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#eef2ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                          Self-hosted
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>Selected</div>
                      </div>
                      <CheckCircle style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                    </div>
                    <div
                      style={{
                        ...rowStyle,
                        borderTop: '1px solid #f3f4f6',
                        gap: '16px',
                        opacity: 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                          OpenDataLabs Cloud
                        </div>
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* About & Diagnostics Section */}
            {activeSection === 'about' && (
              <div>
                {/* About */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    About
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Info style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                        Version
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>
                        {appVersion || '...'}{' '}
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                          ({__COMMIT_HASH__})
                        </span>
                      </span>
                    </div>
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6' }}>
                      <span style={{ marginLeft: '56px', color: '#4b5563', fontSize: '14px' }}>
                        Framework
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Tauri v2</span>
                    </div>
                  </div>
                </section>

                {/* Diagnostics */}
                <section style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Diagnostics
                  </h2>
                  <div style={cardStyle}>
                    <div style={{ ...rowStyle, gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor:
                            nodeTestStatus === 'success'
                              ? '#dcfce7'
                              : nodeTestStatus === 'error'
                                ? '#fee2e2'
                                : '#f0fdf4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {nodeTestStatus === 'testing' ? (
                          <Loader
                            style={{
                              width: '20px',
                              height: '20px',
                              color: '#6b7280',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                        ) : nodeTestStatus === 'success' ? (
                          <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                        ) : nodeTestStatus === 'error' ? (
                          <XCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                        ) : (
                          <Play style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                          Node.js Runtime
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {nodeTestStatus === 'idle' && 'Test bundled Node.js runtime'}
                          {nodeTestStatus === 'testing' && 'Testing...'}
                          {nodeTestStatus === 'success' &&
                            nodeTestResult &&
                            `${nodeTestResult.nodejs} on ${nodeTestResult.platform}/${nodeTestResult.arch}`}
                          {nodeTestStatus === 'error' && (nodeTestError || 'Test failed')}
                        </div>
                      </div>
                      <button
                        onClick={testNodeJs}
                        disabled={nodeTestStatus === 'testing'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: nodeTestStatus === 'testing' ? '#9ca3af' : '#4b5563',
                          backgroundColor: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: nodeTestStatus === 'testing' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (nodeTestStatus !== 'testing') {
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {nodeTestStatus === 'testing' ? 'Testing...' : 'Test'}
                      </button>
                    </div>
                    {nodeTestStatus === 'success' && nodeTestResult && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderTop: '1px solid #f3f4f6',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <div
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}
                        >
                          <div>
                            <span style={{ color: '#6b7280' }}>Hostname:</span>{' '}
                            <span style={{ color: '#1a1a1a' }}>{nodeTestResult.hostname}</span>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>CPUs:</span>{' '}
                            <span style={{ color: '#1a1a1a' }}>{nodeTestResult.cpus}</span>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Memory:</span>{' '}
                            <span style={{ color: '#1a1a1a' }}>{nodeTestResult.memory}</span>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Uptime:</span>{' '}
                            <span style={{ color: '#1a1a1a' }}>{nodeTestResult.uptime}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Browser Status */}
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: browserStatus?.available ? '#dcfce7' : '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {browserStatus?.available ? (
                          <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                        ) : (
                          <XCircle style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Browser</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {browserStatus === null
                            ? 'Checking...'
                            : browserStatus.available
                              ? `${browserStatus.browser_type === 'system' ? 'System Chrome/Edge' : 'Downloaded Chromium'} found`
                              : 'No browser found'}
                        </div>
                      </div>
                      <button
                        onClick={checkBrowserStatus}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#4b5563',
                          backgroundColor: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Refresh
                      </button>
                    </div>
                    {/* Connector Paths Debug */}
                    <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                          Connector Paths
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          Debug where app looks for connectors
                        </div>
                      </div>
                      <button
                        onClick={debugPaths}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#4b5563',
                          backgroundColor: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Debug
                      </button>
                    </div>
                    {pathsDebug && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderTop: '1px solid #f3f4f6',
                          backgroundColor: '#f9fafb',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {JSON.stringify(pathsDebug, null, 2)}
                      </div>
                    )}
                  </div>
                </section>

                {/* Resources */}
                <section>
                  <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
                    Resources
                  </h2>
                  <div style={cardStyle}>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...rowStyle,
                        textDecoration: 'none',
                        color: '#1a1a1a',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>GitHub Repository</span>
                      <ExternalLink style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                    </a>
                    <a
                      href="https://docs.databridge.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...rowStyle,
                        borderTop: '1px solid #f3f4f6',
                        textDecoration: 'none',
                        color: '#1a1a1a',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>Documentation</span>
                      <ExternalLink style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                    </a>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
