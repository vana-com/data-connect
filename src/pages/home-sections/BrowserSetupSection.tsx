import { Download, AlertCircle } from 'lucide-react';
import type { BrowserContextType } from '../../context/BrowserContext';

interface BrowserSetupSectionProps {
  browserStatus: BrowserContextType;
}

export function BrowserSetupSection({ browserStatus }: BrowserSetupSectionProps) {
  // Show checking/downloading/needs_browser states
  if (browserStatus.status !== 'ready' && browserStatus.status !== 'error') {
    return (
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
          {browserStatus.status === 'checking' && 'Checking dependencies...'}
          {browserStatus.status === 'downloading' && 'Downloading Chromium'}
          {browserStatus.status === 'needs_browser' && 'Browser Required'}
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          {browserStatus.status === 'checking' && 'Please wait...'}
          {browserStatus.status === 'downloading' && `One-time setup (~160 MB) - ${Math.round(browserStatus.progress)}%`}
          {browserStatus.status === 'needs_browser' &&
            'DataBridge uses a browser to securely export your data. Your credentials stay on your device.'}
        </p>
        {browserStatus.status === 'needs_browser' && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={browserStatus.retry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Check Again
            </button>
            <button
              onClick={browserStatus.startDownload}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Download Chromium
            </button>
          </div>
        )}
        {browserStatus.status === 'downloading' && (
          <div
            style={{
              width: '100%',
              maxWidth: '300px',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
              margin: '0 auto',
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
        )}
      </div>
    );
  }

  // Show error state
  if (browserStatus.status === 'error') {
    return (
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
    );
  }

  // Browser ready - nothing to show
  return null;
}
