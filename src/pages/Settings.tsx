import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderOpen, ExternalLink, Database, Info, Play, CheckCircle, XCircle, Loader } from 'lucide-react';

interface NodeJsTestResult {
  nodejs: string;
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  memory: string;
  uptime: string;
}

export function Settings() {
  const [dataPath, setDataPath] = useState<string>('');
  const [nodeTestStatus, setNodeTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [nodeTestResult, setNodeTestResult] = useState<NodeJsTestResult | null>(null);
  const [nodeTestError, setNodeTestError] = useState<string | null>(null);
  const [pathsDebug, setPathsDebug] = useState<Record<string, unknown> | null>(null);
  const [browserStatus, setBrowserStatus] = useState<{ available: boolean; browser_type: string } | null>(null);

  useEffect(() => {
    invoke<string>('get_user_data_path').then((path) => {
      setDataPath(path);
    });
  }, []);

  const openDataFolder = async () => {
    try {
      await invoke('open_folder', { path: dataPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const testNodeJs = async () => {
    setNodeTestStatus('testing');
    setNodeTestResult(null);
    setNodeTestError(null);
    try {
      const result = await invoke<NodeJsTestResult>('test_nodejs');
      setNodeTestResult(result);
      setNodeTestStatus('success');
    } catch (error) {
      setNodeTestError(String(error));
      setNodeTestStatus('error');
    }
  };

  const debugPaths = async () => {
    try {
      const result = await invoke<Record<string, unknown>>('debug_connector_paths');
      setPathsDebug(result);
    } catch (error) {
      console.error('Debug paths error:', error);
    }
  };

  const checkBrowserStatus = async () => {
    try {
      const result = await invoke<{ available: boolean; browser_type: string; needs_download: boolean }>('check_browser_available');
      setBrowserStatus(result);
    } catch (error) {
      console.error('Browser check error:', error);
    }
  };

  useEffect(() => {
    checkBrowserStatus();
  }, []);

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

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
          Manage your preferences
        </p>

        {/* Data Storage */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280', marginBottom: '12px' }}>
            Data storage
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
                onClick={openDataFolder}
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
              <span style={{ flex: 1, fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Version</span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>0.1.0</span>
            </div>
            <div style={{ ...rowStyle, borderTop: '1px solid #f3f4f6' }}>
              <span style={{ marginLeft: '56px', color: '#4b5563', fontSize: '14px' }}>Framework</span>
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
                  backgroundColor: nodeTestStatus === 'success' ? '#dcfce7' : nodeTestStatus === 'error' ? '#fee2e2' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {nodeTestStatus === 'testing' ? (
                  <Loader style={{ width: '20px', height: '20px', color: '#6b7280', animation: 'spin 1s linear infinite' }} />
                ) : nodeTestStatus === 'success' ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                ) : nodeTestStatus === 'error' ? (
                  <XCircle style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                ) : (
                  <Play style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Node.js Runtime</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {nodeTestStatus === 'idle' && 'Test bundled Node.js runtime'}
                  {nodeTestStatus === 'testing' && 'Testing...'}
                  {nodeTestStatus === 'success' && nodeTestResult && `${nodeTestResult.nodejs} on ${nodeTestResult.platform}/${nodeTestResult.arch}`}
                  {nodeTestStatus === 'error' && (nodeTestError || 'Test failed')}
                </div>
              </div>
              <button
                onClick={testNodeJs}
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
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#6b7280' }}>Hostname:</span> <span style={{ color: '#1a1a1a' }}>{nodeTestResult.hostname}</span></div>
                  <div><span style={{ color: '#6b7280' }}>CPUs:</span> <span style={{ color: '#1a1a1a' }}>{nodeTestResult.cpus}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Memory:</span> <span style={{ color: '#1a1a1a' }}>{nodeTestResult.memory}</span></div>
                  <div><span style={{ color: '#6b7280' }}>Uptime:</span> <span style={{ color: '#1a1a1a' }}>{nodeTestResult.uptime}</span></div>
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
                  {browserStatus === null ? 'Checking...' :
                   browserStatus.available ? `${browserStatus.browser_type === 'system' ? 'System Chrome/Edge' : 'Downloaded Chromium'} found` :
                   'No browser found'}
                </div>
              </div>
              <button
                onClick={checkBrowserStatus}
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
                <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Connector Paths</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Debug where app looks for connectors
                </div>
              </div>
              <button
                onClick={debugPaths}
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
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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
    </div>
  );
}
