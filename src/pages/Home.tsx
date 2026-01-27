import { usePlatforms } from '../hooks/usePlatforms';
import { useConnector } from '../hooks/useConnector';
import { useSelector } from 'react-redux';
import { useBrowserStatus } from '../context/BrowserContext';
import type { Platform, RootState } from '../types';
import { ArrowRight, Plus, Download, AlertCircle } from 'lucide-react';

// Platform icon URLs
const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
  instagram: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
};

// Get icon URL for a platform
const getPlatformIcon = (platformName: string): string | null => {
  const name = platformName.toLowerCase();
  if (name.includes('chatgpt')) return PLATFORM_ICONS.chatgpt;
  if (name.includes('instagram')) return PLATFORM_ICONS.instagram;
  return null;
};

// Platform icon component
const PlatformIcon = ({ platform }: { platform: Platform }) => {
  const iconUrl = getPlatformIcon(platform.name);

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={platform.name}
        style={{
          width: '24px',
          height: '24px',
          objectFit: 'contain',
        }}
      />
    );
  }

  return (
    <span style={{ fontSize: '18px', fontWeight: 600, color: '#6b7280' }}>
      {platform.name.charAt(0)}
    </span>
  );
};

export function Home() {
  const { platforms, isPlatformConnected } = usePlatforms();
  const { startExport } = useConnector();
  const runs = useSelector((state: RootState) => state.app.runs);
  const browserStatus = useBrowserStatus();

  const handleExport = async (platform: Platform) => {
    console.log('Starting export for platform:', platform.id, platform.name, 'runtime:', platform.runtime);
    try {
      const runId = await startExport(platform);
      console.log('Export started with runId:', runId);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getLastExportTime = (platformId: string) => {
    const platformRuns = runs
      .filter((r) => r.platformId === platformId && r.status === 'success')
      .sort((a, b) => new Date(b.endDate || b.startDate).getTime() - new Date(a.endDate || a.startDate).getTime());

    if (platformRuns.length === 0) return null;

    const lastRun = platformRuns[0];
    const date = new Date(lastRun.endDate || lastRun.startDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const connectedPlatforms = platforms.filter((p) => isPlatformConnected(p.id));
  const availablePlatforms = platforms.filter((p) => !isPlatformConnected(p.id));

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#f5f5f7',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Header */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '8px',
          }}
        >
          Personal data
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px',
          }}
        >
          Your sources
        </p>

        {/* Browser Setup - Checking */}
        {browserStatus.status === 'checking' && (
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
              Checking dependencies...
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Please wait...
            </p>
          </div>
        )}

        {/* Browser Setup - Needs Browser (user must choose) */}
        {browserStatus.status === 'needs_browser' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '32px 24px',
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
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px', textAlign: 'center' }}>
              Browser Required
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', textAlign: 'center', lineHeight: '1.5' }}>
              DataBridge uses a browser to securely export your data from websites.
              Your credentials stay on your device.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#166534', marginBottom: '4px' }}>
                  Recommended: Install Google Chrome
                </p>
                <p style={{ fontSize: '13px', color: '#15803d', marginBottom: '12px' }}>
                  If you have Chrome installed, DataBridge will use it automatically.
                </p>
                <button
                  onClick={browserStatus.retry}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  I've installed Chrome - Check again
                </button>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Alternative: Download Chromium
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                  Download the open-source browser (~160 MB, one-time).
                </p>
                <button
                  onClick={browserStatus.startDownload}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Download Chromium
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browser Setup - Downloading */}
        {browserStatus.status === 'downloading' && (
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
              Downloading Chromium
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              One-time setup (~160 MB)
            </p>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '8px',
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
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              {Math.round(browserStatus.progress)}%
            </p>
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

        {/* Connected Sources - only show when browser is ready */}
        {browserStatus.status === 'ready' && connectedPlatforms.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            {connectedPlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleExport(platform)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '12px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
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
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlatformIcon platform={platform} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                    {platform.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                    {getLastExportTime(platform.id) || 'Not synced'}
                  </span>
                  <ArrowRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Add source section */}
        {browserStatus.status === 'ready' && (availablePlatforms.length > 0 || connectedPlatforms.length === 0) && (
          <>
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px',
              }}
            >
              {connectedPlatforms.length > 0 ? 'Add another (more coming soon)' : 'Connect a source'}
            </p>

            {availablePlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleExport(platform)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '12px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
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
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlatformIcon platform={platform} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>
                    Connect {platform.name}
                  </div>
                </div>
                <ArrowRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
              </button>
            ))}
          </>
        )}

        {/* Empty state */}
        {browserStatus.status === 'ready' && platforms.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 0',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '16px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus style={{ width: '32px', height: '32px', color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#1a1a1a', marginBottom: '8px' }}>
              No connectors available
            </h3>
            <p style={{ color: '#6b7280' }}>Add connectors to start exporting your data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
