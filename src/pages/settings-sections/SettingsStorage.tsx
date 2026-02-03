import { useState, useEffect } from 'react';
import { FolderOpen, Database, CheckCircle, Server } from 'lucide-react';
import { fetchServerIdentity } from '../../services/serverRegistration';

interface SettingsStorageProps {
  dataPath: string;
  onOpenDataFolder: () => void;
  personalServerPort: number | null;
  personalServerStatus: string;
  walletAddress: string | null;
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

export function SettingsStorage({
  dataPath,
  onOpenDataFolder,
  personalServerPort,
  personalServerStatus,
  walletAddress,
}: SettingsStorageProps) {
  const [serverId, setServerId] = useState<string | null>(null);
  const [identityChecked, setIdentityChecked] = useState(false);

  useEffect(() => {
    if (personalServerPort && personalServerStatus === 'running') {
      fetchServerIdentity(personalServerPort)
        .then((identity) => {
          setServerId(identity.serverId);
          setIdentityChecked(true);
        })
        .catch(() => setIdentityChecked(true));
    }
  }, [personalServerPort, personalServerStatus]);

  const isServerRunning = personalServerStatus === 'running';
  const isRegistered = !!serverId;

  return (
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
              onClick={onOpenDataFolder}
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
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Vana Storage</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
            </div>
          </div>
          <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Google Drive</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
            </div>
          </div>
          <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
          Server
        </h2>
        <div style={cardStyle}>
          <div style={{ ...rowStyle, gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Self-hosted</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Selected</div>
            </div>
            <CheckCircle style={{ width: '20px', height: '20px', color: '#6366f1' }} />
          </div>
          <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px', opacity: 0.6 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>OpenDataLabs Cloud</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Coming soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Server */}
      <section>
        <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
          Personal Server
        </h2>
        <div style={cardStyle}>
          <div style={{ ...rowStyle, gap: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isServerRunning ? '#ecfdf5' : '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Server style={{ width: '20px', height: '20px', color: isServerRunning ? '#10b981' : '#9ca3af' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Status</div>
              <div style={{ fontSize: '13px', color: isServerRunning ? '#10b981' : '#6b7280' }}>
                {isServerRunning ? `Running on port ${personalServerPort}` : personalServerStatus === 'starting' ? 'Starting...' : 'Stopped'}
              </div>
            </div>
          </div>

          <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6', gap: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isRegistered ? '#ecfdf5' : '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isRegistered ? (
                <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981' }} />
              ) : (
                <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Registration</div>
              <div style={{ fontSize: '13px', color: isRegistered ? '#10b981' : '#6b7280' }}>
                {!isServerRunning
                  ? 'Server not running'
                  : !identityChecked
                    ? 'Checking...'
                    : isRegistered
                      ? `Registered (${serverId})`
                      : 'Not registered — will register on next sign-in'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
