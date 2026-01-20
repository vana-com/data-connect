import { usePlatforms } from '../hooks/usePlatforms';
import { useConnector } from '../hooks/useConnector';
import { useSelector } from 'react-redux';
import type { Platform, RootState } from '../types';
import { ArrowRight, Plus } from 'lucide-react';

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

  const handleExport = async (platform: Platform) => {
    await startExport(platform);
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

        {/* Connected Sources */}
        {connectedPlatforms.length > 0 && (
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
        {(availablePlatforms.length > 0 || connectedPlatforms.length === 0) && (
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
        {platforms.length === 0 && (
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
