import { useCallback } from 'react';
import { useConnectorUpdates } from '../hooks/useConnectorUpdates';
import { usePlatforms } from '../hooks/usePlatforms';
import { Download, RefreshCw, Sparkles, ArrowUpCircle, Loader2, AlertCircle } from 'lucide-react';
import type { ConnectorUpdateInfo } from '../types';
import { PlatformIcon } from '../lib/platformIcons';

interface ConnectorUpdateItemProps {
  update: ConnectorUpdateInfo;
  onDownload: (id: string) => void;
  isDownloading: boolean;
}

function ConnectorUpdateItem({ update, onDownload, isDownloading }: ConnectorUpdateItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PlatformIcon name={update.name} size={20} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
            {update.name}
          </span>
          {update.isNew ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '4px',
              }}
            >
              <Sparkles style={{ width: '10px', height: '10px' }} />
              New
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '4px',
              }}
            >
              <ArrowUpCircle style={{ width: '10px', height: '10px' }} />
              Update
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          {update.isNew ? (
            `v${update.latestVersion}`
          ) : (
            `v${update.currentVersion} → v${update.latestVersion}`
          )}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={() => onDownload(update.id)}
        disabled={isDownloading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: isDownloading ? '#f3f4f6' : '#6366f1',
          color: isDownloading ? '#9ca3af' : 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isDownloading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {isDownloading ? (
          <>
            <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
            Installing...
          </>
        ) : (
          <>
            <Download style={{ width: '14px', height: '14px' }} />
            {update.isNew ? 'Install' : 'Update'}
          </>
        )}
      </button>
    </div>
  );
}

export function ConnectorUpdates() {
  const {
    updates,
    isCheckingUpdates,
    error,
    checkForUpdates,
    downloadConnector,
    isDownloading,
  } = useConnectorUpdates();
  const { loadPlatforms } = usePlatforms();

  // Wrap downloadConnector to reload platforms after successful download
  const handleDownload = useCallback(async (id: string) => {
    const success = await downloadConnector(id);
    if (success) {
      await loadPlatforms();
    }
  }, [downloadConnector, loadPlatforms]);

  if (updates.length === 0 && !isCheckingUpdates && !error) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: updates.length > 0 ? '12px' : '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download style={{ width: '16px', height: '16px', color: '#6366f1' }} />
          <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '14px' }}>
            {updates.length > 0
              ? `${updates.length} Connector${updates.length > 1 ? 's' : ''} Available`
              : 'Checking for updates...'}
          </span>
        </div>
        <button
          onClick={() => checkForUpdates(true)}
          disabled={isCheckingUpdates}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: isCheckingUpdates ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw
            style={{
              width: '12px',
              height: '12px',
              animation: isCheckingUpdates ? 'spin 1s linear infinite' : 'none',
            }}
          />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: updates.length > 0 ? '12px' : '0',
          }}
        >
          <AlertCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
          <span style={{ fontSize: '13px', color: '#b91c1c' }}>{error}</span>
        </div>
      )}

      {/* Updates list */}
      {updates.map((update) => (
        <ConnectorUpdateItem
          key={update.id}
          update={update}
          onDownload={handleDownload}
          isDownloading={isDownloading(update.id)}
        />
      ))}

      {/* CSS for spin animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

interface ConnectorUpdatesBadgeProps {
  onClick?: () => void;
}

export function ConnectorUpdatesBadge({ onClick }: ConnectorUpdatesBadgeProps) {
  const { updateCount, isCheckingUpdates } = useConnectorUpdates();

  if (updateCount === 0 && !isCheckingUpdates) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#eef2ff',
        color: '#4f46e5',
        border: '1px solid #c7d2fe',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {isCheckingUpdates ? (
        <>
          <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
          Checking...
        </>
      ) : (
        <>
          <Download style={{ width: '14px', height: '14px' }} />
          {updateCount} update{updateCount > 1 ? 's' : ''} available
        </>
      )}
    </button>
  );
}
