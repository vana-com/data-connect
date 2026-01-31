import { Database, Monitor, Shield, LogOut } from 'lucide-react';
import type { AuthUser } from '../../types';

interface SettingsAccountProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
  onLogout: () => void;
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

export function SettingsAccount({ user, isAuthenticated, onLogout }: SettingsAccountProps) {
  return (
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
                onClick={onLogout}
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
  );
}
