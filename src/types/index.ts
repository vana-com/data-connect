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
  exportData?: ExportedData;
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
}

export interface RootState {
  app: AppState;
}

export interface ConnectorLogEvent {
  runId: string;
  message: string;
  timestamp: number;
}

export interface ConnectorStatusEvent {
  runId: string;
  status: string | { data: unknown };
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
