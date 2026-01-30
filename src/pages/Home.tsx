import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { usePlatforms } from '../hooks/usePlatforms';
import { useConnector } from '../hooks/useConnector';
import { useConnectorUpdates } from '../hooks/useConnectorUpdates';
import { useBrowserStatus } from '../context/BrowserContext';
import type { Platform, RootState, Run } from '../types';
import { ExternalLink, Database, Download, AlertCircle, Check } from 'lucide-react';
import { ConnectorUpdates } from '../components/ConnectorUpdates';
import { PlatformIcon } from '../lib/platformIcons';

type TabKey = 'sources' | 'apps';

/** Compute recently completed platform IDs from runs (memoized, no effect needed) */
function computeRecentlyCompleted(runs: Run[]): Set<string> {
  return new Set(
    runs
      .filter((r) => r.status === 'success')
      .sort((a, b) => new Date(b.endDate || b.startDate).getTime() - new Date(a.endDate || a.startDate).getTime())
      .map((r) => r.platformId)
  );
}

export function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('sources');
  const { platforms, isPlatformConnected } = usePlatforms();
  const { startExport } = useConnector();
  const { checkForUpdates } = useConnectorUpdates();
  const browserStatus = useBrowserStatus();
  const runs = useSelector((state: RootState) => state.app.runs);

  // Derived state: recently completed platform IDs (memoized, not effect-stored)
  const recentlyCompleted = useMemo(() => computeRecentlyCompleted(runs), [runs]);

  // Check for connector updates on mount (when browser is ready)
  useEffect(() => {
    if (browserStatus.status === 'ready') {
      checkForUpdates();
    }
  }, [browserStatus.status, checkForUpdates]);

  const handleExport = async (platform: Platform) => {
    console.log('Starting export for platform:', platform.id, platform.name, 'runtime:', platform.runtime);
    try {
      await startExport(platform);
      // No navigation - stay on this page
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Separate connected and available platforms (memoized to avoid re-filtering on every render)
  const connectedPlatforms = useMemo(
    () => platforms.filter((p) => isPlatformConnected(p.id) || recentlyCompleted.has(p.id)),
    [platforms, isPlatformConnected, recentlyCompleted]
  );
  const availablePlatforms = useMemo(
    () => platforms.filter((p) => !isPlatformConnected(p.id) && !recentlyCompleted.has(p.id)),
    [platforms, isPlatformConnected, recentlyCompleted]
  );

  const isRecentlyCompleted = (platformId: string) => recentlyCompleted.has(platformId) && !isPlatformConnected(platformId);

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Your Data
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
          Manage your connected data sources and applications
        </p>

        {/* Browser Setup - Checking */}
        {browserStatus.status !== 'ready' && browserStatus.status !== 'error' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
              {browserStatus.status === 'checking' && 'Checking dependencies...'}
              {browserStatus.status === 'downloading' && 'Downloading Chromium'}
              {browserStatus.status === 'needs_browser' && 'Browser Required'}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              {browserStatus.status === 'checking' && 'Please wait...'}
              {browserStatus.status === 'downloading' && `One-time setup (~160 MB) - ${Math.round(browserStatus.progress)}%`}
              {browserStatus.status === 'needs_browser' &&
                'DataBridge uses a browser to securely export your data. Your credentials stay on your device.'}
            </p>
            {browserStatus.status === 'needs_browser' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={browserStatus.retry}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Check Again
                </button>
                <button
                  onClick={browserStatus.startDownload}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Download Chromium
                </button>
              </div>
            )}
            {browserStatus.status === 'downloading' && (
              <div
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '4px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    width: `${browserStatus.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Browser Setup Error */}
        {browserStatus.status === 'error' && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
                  Setup failed
                </h3>
                <p style={{ fontSize: '14px', color: '#b91c1c', marginBottom: '12px' }}>
                  {browserStatus.error || 'Failed to download browser'}
                </p>
                <button
                  onClick={browserStatus.retry}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connector Updates - show when browser is ready */}
        {browserStatus.status === 'ready' && <ConnectorUpdates />}

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '32px',
            backgroundColor: '#e5e7eb',
            padding: '4px',
            borderRadius: '10px',
            width: 'fit-content',
          }}
        >
          {[
            { key: 'sources' as TabKey, label: 'Your data' },
            { key: 'apps' as TabKey, label: 'Connected apps' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === tab.key ? '#1a1a1a' : '#6b7280',
                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div>
            {/* Connected Sources - with green checkmark */}
            {browserStatus.status === 'ready' && connectedPlatforms.length > 0 && (
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                  Connected sources
                </h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {connectedPlatforms.map((platform) => {
                    const completed = isRecentlyCompleted(platform.id);
                    return (
                      <div
                        key={platform.id}
                        style={{
                          backgroundColor: 'white',
                          border: completed ? '1px solid #22c55e' : '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: completed ? '#dcfce7' : '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <PlatformIcon name={platform.name} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px', marginBottom: '2px' }}>
                            {platform.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                            Connected
                          </div>
                        </div>
                        {completed && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check style={{ width: '14px', height: '14px', color: 'white', strokeWidth: 3 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Available Sources */}
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                Connect your data sources
              </h2>
              {browserStatus.status === 'ready' && availablePlatforms.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handleExport(platform)}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#6366f1';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.boxShadow = 'none';
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
                        <PlatformIcon name={platform.name} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px', marginBottom: '2px' }}>
                          Connect {platform.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{platform.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                  }}
                >
                  <Database style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                  <p style={{ color: '#6b7280', marginBottom: '0' }}>
                    {browserStatus.status !== 'ready' ? 'Complete browser setup to view connectors' : 'No available data sources'}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Connected Apps Tab */}
        {activeTab === 'apps' && (
          <div>
            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '48px',
                textAlign: 'center',
              }}
            >
              <Database style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                No connected apps yet
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                Apps that you authorize to access your data will appear here
              </p>
              <a
                href="https://docs.vana.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: '#6366f1',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Learn more
                <ExternalLink style={{ width: '16px', height: '16px' }} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
