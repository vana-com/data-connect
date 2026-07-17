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
  /** Scopes this connector can export (e.g. ["chatgpt.conversations", "chatgpt.memories"]) */
  scopes?: string[] | null;
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
  status: 'pending' | 'running' | 'success' | 'partial' | 'error' | 'stopped';
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
  // Sync status
  syncedToPersonalServer?: boolean;
  scope?: string;
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
  auth: AuthState;
  connectedApps: ConnectedApp[];
  appConfig: AppConfig;
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
  outcome?: 'success' | 'partial' | 'failure' | 'cancelled';
  errorClass?: string;
  recordCount?: number;
  scopeSummary?: {
    requested: number;
    produced: number;
    degraded: number;
    omitted: number;
  };
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

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  walletAddress: string | null;
  masterKeySignature: string | null;
  accountRole: 'standard' | 'debug';
}

export interface AuthUser {
  id: string;
  email?: string;
  wallet?: {
    address: string;
    walletClientType: string;
  };
}

export interface ConnectedApp {
  id: string;
  name: string;
  icon?: string;
  permissions: string[];
  connectedAt: string;
  externalUrl?: string;
}

export interface AppConfig {
  storageProvider: 'local' | 'vana' | 'gdrive' | 'dropbox';
  /**
   * - `local-only` (default): no backend provider is configured. Exports
   *   land on local disk only (`write_export_data`, always unconditional)
   *   and no Vana Personal Server is started or synced to. This is the
   *   local-first boot path — it requires no Vana sign-in.
   * - `local`: opt-in. Start the bundled Personal Server as a Tauri
   *   subprocess (requires Vana credentials) and point ingest at it.
   * - `remote`: opt-in. Skip local startup and point ingest at
   *   `remoteServerUrl`. Ingest sends `Authorization: Bearer
   *   <vanaAccessToken>` and the remote PS verifies it via
   *   account.vana.org's introspection proxy (Vana session auth). The
   *   user obtains the access token via the "Connect with Vana" Hydra
   *   device-code flow.
   */
  serverMode: 'local-only' | 'local' | 'remote';
  /** Required when `serverMode === 'remote'`. e.g. `https://0xabc….myvana.app`. */
  remoteServerUrl?: string;
  /**
   * Vana session access token for the remote PS. Stored in plaintext for
   * dev simplicity; production should move to Tauri Stronghold or OS
   * Keychain. Refreshed on demand via the refresh token at
   * `vanaRefreshToken`.
   */
  vanaAccessToken?: string;
  /** Vana session refresh token. */
  vanaRefreshToken?: string;
  /** Unix epoch (seconds) when `vanaAccessToken` expires. */
  vanaAccessTokenExpiresAt?: number;
}
