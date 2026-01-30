import { Database } from 'lucide-react';
import { PlatformIcon } from '../../lib/platformIcons';
import type { Platform } from '../../types';

interface AvailableSourcesListProps {
  platforms: Platform[];
  browserReady: boolean;
  onExport: (platform: Platform) => void;
}

export function AvailableSourcesList({ platforms, browserReady, onExport }: AvailableSourcesListProps) {
  return (
    <section>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
        Connect your data sources
      </h2>
      {browserReady && platforms.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onExport(platform)}
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
            {!browserReady ? 'Complete browser setup to view connectors' : 'No available data sources'}
          </p>
        </div>
      )}
    </section>
  );
}
