import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { useConnector } from '../hooks/useConnector';
import { useAuth } from '../hooks/useAuth';
import { usePersonalServer } from '../hooks/usePersonalServer';
import { fetchServerIdentity } from '../services/serverRegistration';
import { getScopeForPlatform, ingestData } from '../services/personalServerIngest';
import type { RootState } from '../state/store';
import type { Run } from '../types';
import {
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Square,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Server,
  LogIn,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ChatGPT SVG Icon
const ChatGPTIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }} fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

interface RunItemProps {
  run: Run;
  onStop: (id: string) => void;
  serverPort: number | null;
  serverReady: boolean;
}

function RunItem({ run, onStop, serverPort, serverReady }: RunItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [exportData, setExportData] = useState<Run['exportData']>(run.exportData);
  const [loadingData, setLoadingData] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Load export data when expanded
  const handleToggleExpanded = async () => {
    if (!expanded && !exportData && run.exportPath) {
      setLoadingData(true);
      try {
        const data = await invoke<Record<string, unknown>>('load_run_export_data', {
          runId: run.id,
          exportPath: run.exportPath,
        });

        // Transform data to ExportedData format
        // Parse timestamp: handle number, string, or fall back to run.startDate
        let exportedAt = run.startDate;
        if (data.timestamp != null) {
          if (typeof data.timestamp === 'number') {
            exportedAt = new Date(data.timestamp).toISOString();
          } else if (typeof data.timestamp === 'string') {
            const parsed = Date.parse(data.timestamp);
            if (!Number.isNaN(parsed)) {
              exportedAt = new Date(parsed).toISOString();
            }
          }
        }
        // Safely extract nested data with validation
        const innerData = typeof data.data === 'object' && data.data !== null
          ? data.data as Record<string, unknown>
          : {};
        const rawConversations = Array.isArray(innerData.conversations)
          ? innerData.conversations
          : [];

        const transformed: Run['exportData'] = {
          platform: typeof data.platform === 'string' ? data.platform : run.platformId,
          company: typeof data.company === 'string' ? data.company : run.company,
          exportedAt,
          conversations: rawConversations.map((c: unknown) => {
            // Validate each conversation is an object
            if (typeof c !== 'object' || c === null) {
              return { id: '', title: '', url: '', scrapedAt: new Date().toISOString() };
            }
            const conv = c as Record<string, unknown>;
            const scrapedAt = typeof conv.timestamp === 'string'
              ? conv.timestamp
              : typeof conv.timestamp === 'number'
                ? new Date(conv.timestamp).toISOString()
                : new Date().toISOString();
            return {
              id: typeof conv.id === 'string' ? conv.id : '',
              title: typeof conv.title === 'string' ? conv.title : (typeof conv.name === 'string' ? conv.name : ''),
              url: typeof conv.url === 'string' ? conv.url : '',
              scrapedAt,
            };
          }),
          totalConversations: typeof innerData.totalConversations === 'number' ? innerData.totalConversations : undefined,
        };

        setExportData(transformed);
      } catch (error) {
        console.error('Failed to load export data:', error);
      } finally {
        setLoadingData(false);
      }
    }
    setExpanded(!expanded);
  };

  const getStatusIcon = () => {
    const iconStyle = { width: '20px', height: '20px' };
    switch (run.status) {
      case 'running':
        return <Loader2 style={{ ...iconStyle, color: '#6366f1', animation: 'spin 1s linear infinite' }} />;
      case 'success':
        return <CheckCircle style={{ ...iconStyle, color: '#22c55e' }} />;
      case 'error':
        return <XCircle style={{ ...iconStyle, color: '#ef4444' }} />;
      case 'stopped':
        return <Square style={{ ...iconStyle, color: '#9ca3af' }} />;
      default:
        return <Activity style={{ ...iconStyle, color: '#9ca3af' }} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const scope = getScopeForPlatform(run.platformId);
  const canIngest = serverReady && !!serverPort && !!run.exportPath && !!scope;

  const handleIngest = async () => {
    if (!canIngest) return;
    setIngestStatus('sending');
    try {
      // exportPath is a file path — pass parent directory to load_run_export_data
      const dirPath = run.exportPath!.replace(/\/[^/]+$/, '');
      const data = await invoke<Record<string, unknown>>('load_run_export_data', {
        runId: run.id,
        exportPath: dirPath,
      });
      // The stored file wraps data in RunData { company, name, run_id, timestamp, content }
      // Send the content field (the actual export data) to the personal server
      const payload = (data.content ?? data) as object;
      await ingestData(serverPort!, scope!, payload);
      setIngestStatus('sent');
    } catch (err) {
      console.error('[Ingest] Failed:', err);
      setIngestStatus('error');
    }
  };

  const openFolder = async () => {
    if (run.exportPath) {
      try {
        await invoke('open_folder', { path: run.exportPath });
      } catch (error) {
        console.error('Failed to open folder:', error);
      }
    }
  };

  const conversations = exportData?.conversations || [];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
        }}
      >
        {/* Platform icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <ChatGPTIcon />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>{run.name}</span>
            {getStatusIcon()}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            {formatDate(run.startDate)}
            {run.status === 'success' && run.itemsExported != null && (
              <span style={{ marginLeft: '8px', color: '#22c55e' }}>
                {run.itemsExported} {run.itemLabel || 'items'}
              </span>
            )}
            {run.status === 'error' && (
              <span style={{ marginLeft: '8px', color: '#ef4444' }}>
                Failed
              </span>
            )}
            {run.status === 'stopped' && (
              <span style={{ marginLeft: '8px', color: '#9ca3af' }}>
                Stopped
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {run.status === 'running' && (
            <button
              onClick={() => onStop(run.id)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#ef4444',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Stop
            </button>
          )}
          {run.exportPath && (
            <button
              onClick={openFolder}
              style={{
                padding: '8px',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Open folder"
            >
              <FolderOpen style={{ width: '18px', height: '18px' }} />
            </button>
          )}
          {run.exportPath && scope && (
            <button
              onClick={handleIngest}
              disabled={!canIngest || ingestStatus === 'sending' || ingestStatus === 'sent'}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 500,
                color: ingestStatus === 'sent' ? '#10b981' : ingestStatus === 'error' ? '#ef4444' : canIngest ? '#6366f1' : '#9ca3af',
                backgroundColor: 'transparent',
                border: `1px solid ${ingestStatus === 'sent' ? '#10b981' : ingestStatus === 'error' ? '#ef4444' : canIngest ? '#e0e7ff' : '#e5e7eb'}`,
                borderRadius: '6px',
                cursor: canIngest && ingestStatus !== 'sending' && ingestStatus !== 'sent' ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: canIngest || ingestStatus === 'sent' || ingestStatus === 'error' ? 1 : 0.5,
              }}
              title={!serverReady ? 'Personal server not running' : ingestStatus === 'sent' ? 'Sent to personal server' : 'Send to personal server'}
            >
              {ingestStatus === 'sending' ? (
                <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              ) : ingestStatus === 'sent' ? (
                <CheckCircle style={{ width: '14px', height: '14px' }} />
              ) : (
                <Upload style={{ width: '14px', height: '14px' }} />
              )}
              {ingestStatus === 'sent' ? 'Sent' : ingestStatus === 'error' ? 'Failed' : 'Ingest'}
            </button>
          )}
          {run.exportPath && (conversations.length > 0 || (!expanded && !exportData)) && (
            <button
              onClick={handleToggleExpanded}
              style={{
                padding: '8px',
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {expanded ? (
                <ChevronUp style={{ width: '18px', height: '18px' }} />
              ) : (
                <ChevronDown style={{ width: '18px', height: '18px' }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress section for running */}
      {run.status === 'running' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Step indicator */}
          {run.phase && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {/* Step dots */}
                {Array.from({ length: run.phase.total }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: i + 1 <= run.phase!.step ? '#6366f1' : '#e5e7eb',
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                ))}
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                  Step {run.phase.step} of {run.phase.total}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
                {run.phase.label}
                {run.itemCount !== undefined && run.itemCount > 0 && (
                  <span style={{ color: '#6366f1', marginLeft: '8px' }}>
                    ({run.itemCount} found)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div
            style={{
              height: '4px',
              backgroundColor: '#f3f4f6',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: run.phase ? `${(run.phase.step / run.phase.total) * 100}%` : '25%',
                backgroundColor: '#6366f1',
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          {/* Status message */}
          {run.statusMessage && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              {run.statusMessage}
            </p>
          )}
        </div>
      )}

      {/* Expanded conversations */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid #f3f4f6',
            maxHeight: '256px',
            overflowY: 'auto',
          }}
        >
          {loadingData ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '13px',
              }}
            >
              Loading data...
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv, index) => (
              <div
                key={conv.id}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
                }}
              >
                <div style={{ fontWeight: 500, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.url}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '13px',
              }}
            >
              No conversation data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PersonalServerCardProps {
  isAuthenticated: boolean;
  personalServer: ReturnType<typeof usePersonalServer>;
  serverId: string | null;
}

function PersonalServerCard({ isAuthenticated, personalServer, serverId }: PersonalServerCardProps) {
  const navigate = useNavigate();

  const isRunning = personalServer.status === 'running';
  const isStarting = personalServer.status === 'starting';

  // Not signed in — prompt to sign in
  if (!isAuthenticated) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
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
            flexShrink: 0,
          }}
        >
          <Server style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Personal Server</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>Sign in to start your personal server</div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 border-0 rounded-lg cursor-pointer"
        >
          <LogIn style={{ width: '14px', height: '14px' }} />
          Sign in
        </button>
      </div>
    );
  }

  // Server status card
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: isRunning ? '#ecfdf5' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isStarting ? (
          <Loader2 style={{ width: '20px', height: '20px', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        ) : (
          <Server style={{ width: '20px', height: '20px', color: isRunning ? '#10b981' : '#9ca3af' }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '15px' }}>Personal Server</div>
        <div style={{ fontSize: '13px', color: isRunning ? '#10b981' : '#6b7280' }}>
          {isRunning
            ? `Running on port ${personalServer.port}${serverId ? ` · Registered` : ''}`
            : isStarting
              ? 'Starting...'
              : personalServer.status === 'error'
                ? personalServer.error || 'Failed to start'
                : 'Stopped'}
        </div>
      </div>
      {isRunning && (
        <CheckCircle style={{ width: '20px', height: '20px', color: '#10b981', flexShrink: 0 }} />
      )}
      {personalServer.status === 'error' && (
        <XCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
      )}
    </div>
  );
}

export function Runs() {
  const runs = useSelector((state: RootState) => state.app.runs);
  const { stopExport } = useConnector();
  const { isAuthenticated } = useAuth();
  const personalServer = usePersonalServer();
  const [serverId, setServerId] = useState<string | null>(null);

  useEffect(() => {
    if (personalServer.status === 'running' && personalServer.port) {
      fetchServerIdentity(personalServer.port)
        .then((identity) => setServerId(identity.serverId))
        .catch(() => {});
    } else {
      setServerId(null);
    }
  }, [personalServer.status, personalServer.port]);

  const serverReady = personalServer.status === 'running' && !!serverId;

  // Only show finished runs (success, error, stopped) — not in-progress
  const finishedRuns = useMemo(() => {
    return [...runs]
      .filter(run => run.status !== 'running' && run.status !== 'pending')
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [runs]);

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Export history
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
          Your data export runs
        </p>

        <PersonalServerCard isAuthenticated={isAuthenticated} personalServer={personalServer} serverId={serverId} />

        {finishedRuns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '16px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity style={{ width: '32px', height: '32px', color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#1a1a1a', marginBottom: '8px' }}>
              No exports yet
            </h3>
            <p style={{ color: '#6b7280' }}>Start an export from the Data Sources page.</p>
          </div>
        ) : (
          <div>
            {finishedRuns.map((run) => (
              <RunItem key={run.id} run={run} onStop={stopExport} serverPort={personalServer.port} serverReady={serverReady} />
            ))}
          </div>
        )}
      </div>

      {/* Add keyframes for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
