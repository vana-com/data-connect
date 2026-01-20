import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderOpen, ExternalLink, Database, Info } from 'lucide-react';

export function Settings() {
  const [dataPath, setDataPath] = useState<string>('');

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
