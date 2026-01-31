import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { usePlatforms } from '../hooks/usePlatforms';
import { useConnector } from '../hooks/useConnector';
import { useConnectorUpdates } from '../hooks/useConnectorUpdates';
import { useBrowserStatus } from '../context/BrowserContext';
import type { Platform, RootState, Run } from '../types';
import { ExternalLink, Database } from 'lucide-react';
import { ConnectorUpdates } from '../components/ConnectorUpdates';
import {
  BrowserSetupSection,
  ConnectedSourcesList,
  AvailableSourcesList,
} from './home-sections';

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
  const { platforms, isPlatformConnected, loadPlatforms } = usePlatforms();
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

        {/* Browser Setup */}
        <BrowserSetupSection browserStatus={browserStatus} />

        {/* Connector Updates - show when browser is ready */}
        {browserStatus.status === 'ready' && (
          <ConnectorUpdates onReloadPlatforms={loadPlatforms} />
        )}

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
            {/* Connected Sources */}
            {browserStatus.status === 'ready' && (
              <ConnectedSourcesList
                platforms={connectedPlatforms}
                isRecentlyCompleted={isRecentlyCompleted}
              />
            )}

            {/* Available Sources */}
            <AvailableSourcesList
              platforms={availablePlatforms}
              browserReady={browserStatus.status === 'ready'}
              onExport={handleExport}
            />
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
