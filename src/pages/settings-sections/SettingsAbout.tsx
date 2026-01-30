import {
  ExternalLink,
  Info,
  Play,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';

interface NodeJsTestResult {
  nodejs: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: string;
  uptime: string;
}

interface BrowserStatus {
  available: boolean;
  browser_type: string;
}

interface SettingsAboutProps {
  appVersion: string;
  nodeTestStatus: 'idle' | 'testing' | 'success' | 'error';
  nodeTestResult: NodeJsTestResult | null;
  nodeTestError: string | null;
  browserStatus: BrowserStatus | null;
  pathsDebug: Record<string, unknown> | null;
  onTestNodeJs: () => void;
  onCheckBrowserStatus: () => void;
  onDebugPaths: () => void;
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

export function SettingsAbout({
  appVersion,
  nodeTestStatus,
  nodeTestResult,
  nodeTestError,
  browserStatus,
  pathsDebug,
  onTestNodeJs,
  onCheckBrowserStatus,
  onDebugPaths,
}: SettingsAboutProps) {
  return (
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
              onClick={onTestNodeJs}
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
              onClick={onCheckBrowserStatus}
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
              onClick={onDebugPaths}
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
  );
}
