import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Database, ExternalLink, Plus } from 'lucide-react';
import { usePlatforms } from '../hooks/usePlatforms';
import type { RootState } from '../state/store';

type TabKey = 'sources' | 'apps';

// Platform display configuration
const PLATFORM_DISPLAY: Record<
  string,
  { icon: string; color: string; displayName?: string }
> = {
  chatgpt: { icon: '🤖', color: '#10a37f', displayName: 'ChatGPT' },
  x: { icon: '𝕏', color: '#000000', displayName: 'X (Twitter)' },
  twitter: { icon: '🐦', color: '#1da1f2', displayName: 'Twitter' },
  reddit: { icon: '🔴', color: '#ff4500', displayName: 'Reddit' },
  linkedin: { icon: '💼', color: '#0077b5', displayName: 'LinkedIn' },
  facebook: { icon: '👤', color: '#1877f2', displayName: 'Facebook' },
  google: { icon: '🔵', color: '#4285f4', displayName: 'Google' },
  instagram: { icon: '📸', color: '#e1306c', displayName: 'Instagram' },
  tiktok: { icon: '🎵', color: '#000000', displayName: 'TikTok' },
  youtube: { icon: '▶️', color: '#ff0000', displayName: 'YouTube' },
};

export function YourData() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('sources');
  const { platforms } = usePlatforms();
  const connectedPlatforms = useSelector((state: RootState) => state.app.connectedPlatforms);

  // Determine connection status from state, not platform property
  const connectedSources = platforms.filter((p) => connectedPlatforms[p.id]);
  const availableSources = platforms.filter((p) => !connectedPlatforms[p.id]);

  const handleConnectSource = (platformId: string) => {
    navigate(`/?platform=${platformId}`);
  };

  const getPlatformDisplay = (platform: { id: string; name: string }) => {
    return PLATFORM_DISPLAY[platform.id] || {
      icon: '📦',
      color: '#6366f1',
      displayName: platform.name,
    };
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Your Data
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
          Manage your connected data sources and applications
        </p>

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
            {connectedSources.length > 0 && (
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                  Connected sources
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {connectedSources.map((platform) => {
                    const display = getPlatformDisplay(platform);
                    return (
                      <div
                        key={platform.id}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: display.color + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>{display.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px', marginBottom: '2px' }}>
                            {display.displayName || platform.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#22c55e' }}>Connected</div>
                        </div>
                        <button
                          onClick={() => navigate('/runs')}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: '#6366f1',
                            backgroundColor: 'transparent',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          View
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Available Sources */}
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                {connectedSources.length > 0 ? 'Add more sources' : 'Connect your data sources'}
              </h2>
              {availableSources.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {availableSources.map((platform) => {
                    const display = getPlatformDisplay(platform);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => handleConnectSource(platform.id)}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: display.color + '20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: '24px' }}>{display.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px', marginBottom: '2px' }}>
                            {display.displayName || platform.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{platform.description}</div>
                        </div>
                        <Plus style={{ width: '20px', height: '20px', color: '#6366f1', flexShrink: 0 }} />
                      </button>
                    );
                  })}
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
                  <p style={{ color: '#6b7280', marginBottom: '0' }}>No available data sources</p>
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
