export interface Platform {
  id: string;
  company: string;
  name: string;
  filename: string;
  description: string;
  isUpdated: boolean;
  logoURL: string;
  needsConnection: boolean;
  connectURL: string | null;
  connectSelector: string | null;
  exportFrequency: string | null;
  vectorize_config: Record<string, unknown> | null;
  /** Runtime type: "vanilla" (default) or "network-capture" (uses network interception) */
  runtime?: string | null;
}

export interface ProgressPhase {
  step: number;
  total: number;
  label: string;
}

export interface Run {
  id: string;
  platformId: string;
  filename: string;
  isConnected: boolean;
  startDate: string;
  endDate?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'stopped';
  url: string;
  exportSize?: number;
  exportPath?: string;
  company: string;
  name: string;
  currentStep?: string;
  logs?: string;
  statusMessage?: string;
  itemsExported?: number;
  itemLabel?: string;  // e.g., "posts", "conversations"
  exportData?: ExportedData;
  // Progress tracking
  phase?: ProgressPhase;
  itemCount?: number;  // Real-time count during collection
}

export interface ExportedData {
  platform: string;
  company: string;
  exportedAt: string;
  userInfo?: { name?: string; email?: string };
  conversations?: Array<{
    id: string;
    title: string;
    url: string;
    scrapedAt: string;
  }>;
  totalConversations?: number;
}

export interface AppState {
  route: string;
  activeRunIndex: number;
  isFullScreen: boolean;
  isMac: boolean;
  isRunLayerVisible: boolean;
  breadcrumb: { text: string; link: string }[];
  runs: Run[];
  platforms: Platform[];
  connectedPlatforms: Record<string, boolean>;
  connectorUpdates: ConnectorUpdateInfo[];
  lastUpdateCheck: string | null;
  isCheckingUpdates: boolean;
}

export interface RootState {
  app: AppState;
}

export interface ConnectorLogEvent {
  runId: string;
  message: string;
  timestamp: number;
}

export interface ConnectorStatusPayload {
  type: string;
  message: string;
  phase?: ProgressPhase;
  count?: number;
  data?: unknown;
}

export interface ConnectorStatusEvent {
  runId: string;
  status: ConnectorStatusPayload;
  timestamp: number;
}

export interface DownloadProgressEvent {
  run_id: string;
  filename: string;
  percent: number;
  bytes_downloaded: number;
  total_bytes: number | null;
}

export interface ExportCompleteEvent {
  company: string;
  name: string;
  run_id: string;
  export_path: string;
  export_size: number;
}

export interface ConnectorUpdateInfo {
  id: string;
  name: string;
  description: string;
  company: string;
  currentVersion: string | null;
  latestVersion: string;
  hasUpdate: boolean;
  isNew: boolean;
}
