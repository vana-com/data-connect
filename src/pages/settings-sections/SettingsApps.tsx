import { Shield, Trash2 } from 'lucide-react';
import type { ConnectedApp } from '../../types';

interface SettingsAppsProps {
  connectedApps: ConnectedApp[];
  onRevokeApp: (appId: string) => void;
}

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

export function SettingsApps({ connectedApps, onRevokeApp }: SettingsAppsProps) {
  return (
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
            {connectedApps.map((app, index) => (
              <div
                key={app.id}
                style={{
                  ...rowStyle,
                  ...(index < connectedApps.length - 1
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
                  onClick={() => onRevokeApp(app.id)}
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
  );
}
