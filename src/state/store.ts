import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Run, Platform, AppState, ExportedData, ProgressPhase, ConnectorUpdateInfo, AuthState, AuthUser, ConnectedApp, AppConfig } from '../types';

const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  walletAddress: null,
  masterKeySignature: null,
};

const initialAppConfig: AppConfig = {
  storageProvider: 'local',
  serverMode: 'cloud',
};

const initialState: AppState = {
  route: '/',
  activeRunIndex: 0,
  isFullScreen: false,
  isMac: false,
  isRunLayerVisible: false,
  breadcrumb: [{ text: 'Home', link: '/' }],
  runs: [],
  platforms: [],
  connectedPlatforms: {},
  connectorUpdates: [],
  lastUpdateCheck: null,
  isCheckingUpdates: false,
  auth: initialAuthState,
  connectedApps: [],
  appConfig: initialAppConfig,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentRoute(state, action: PayloadAction<string>) {
      state.route = action.payload;
    },
    setActiveRunIndex(state, action: PayloadAction<number>) {
      state.activeRunIndex = Math.min(
        Math.max(0, action.payload),
        state.runs.length - 1
      );
    },
    toggleRunVisibility(state) {
      state.isRunLayerVisible = !state.isRunLayerVisible;
    },
    setIsRunLayerVisible(state, action: PayloadAction<boolean>) {
      state.isRunLayerVisible = action.payload;
    },
    updateBreadcrumb(
      state,
      action: PayloadAction<{ text: string; link: string }[]>
    ) {
      state.breadcrumb = action.payload;
    },
    setIsMac(state, action: PayloadAction<boolean>) {
      state.isMac = action.payload;
    },
    setPlatforms(state, action: PayloadAction<Platform[]>) {
      state.platforms = action.payload;
    },
    setRuns(state, action: PayloadAction<Run[]>) {
      state.runs = action.payload;
    },
    setConnectedPlatforms(state, action: PayloadAction<Record<string, boolean>>) {
      state.connectedPlatforms = action.payload;
    },
    startRun(state, action: PayloadAction<Run>) {
      state.runs.push(action.payload);
    },
    deleteRun(state, action: PayloadAction<string>) {
      state.runs = state.runs.filter((run) => run.id !== action.payload);
      if (state.runs.length === 0) {
        state.isRunLayerVisible = false;
      }
    },
    updateRunStatus(
      state,
      action: PayloadAction<{
        runId: string;
        status: Run['status'];
        endDate?: string;
        onlyIfRunning?: boolean;
      }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
        // If onlyIfRunning is true, don't overwrite success/error status
        // This prevents STOPPED from overwriting a completed run
        if (action.payload.onlyIfRunning && (run.status === 'success' || run.status === 'error')) {
          return;
        }
        run.status = action.payload.status;
        if (action.payload.endDate) {
          run.endDate = action.payload.endDate;
        }
      }
    },
    updateExportStatus(
      state,
      action: PayloadAction<{
        runId: string;
        exportPath: string;
        exportSize: number;
      }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
        run.status = 'success';
        run.exportPath = action.payload.exportPath;
        run.exportSize = action.payload.exportSize;
        run.endDate = new Date().toISOString();
      }
    },
    updateRunLogs(
      state,
      action: PayloadAction<{ runId: string; logs: string }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
        run.logs = (run.logs || '') + action.payload.logs + '\n';
      }
    },
    updateRunConnected(
      state,
      action: PayloadAction<{ runId: string; isConnected: boolean }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
        run.isConnected = action.payload.isConnected;
      }
    },
    updateRunExportData(
      state,
      action: PayloadAction<{
        runId: string;
        statusMessage?: string;
        itemsExported?: number;
        itemLabel?: string;
        exportData?: ExportedData;
        phase?: ProgressPhase;
        itemCount?: number;
      }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
        if (action.payload.statusMessage) {
          run.statusMessage = action.payload.statusMessage;
        }
        if (action.payload.itemsExported !== undefined) {
          run.itemsExported = action.payload.itemsExported;
        }
        if (action.payload.itemLabel) {
          run.itemLabel = action.payload.itemLabel;
        }
        if (action.payload.exportData) {
          run.exportData = action.payload.exportData;
        }
        if (action.payload.phase) {
          run.phase = action.payload.phase;
        }
        if (action.payload.itemCount !== undefined) {
          run.itemCount = action.payload.itemCount;
        }
      }
    },
    stopRun(state, action: PayloadAction<string>) {
      const run = state.runs.find((r) => r.id === action.payload);
      if (run) {
        run.status = 'stopped';
        run.endDate = new Date().toISOString();
      }
      state.isRunLayerVisible = state.runs.some((r) => r.status === 'running');
    },
    stopAllRuns(state) {
      state.runs.forEach((run) => {
        if (run.status === 'running') {
          run.status = 'stopped';
          run.endDate = new Date().toISOString();
        }
      });
      state.isRunLayerVisible = false;
    },
    setConnectorUpdates(state, action: PayloadAction<ConnectorUpdateInfo[]>) {
      state.connectorUpdates = action.payload;
      state.lastUpdateCheck = new Date().toISOString();
    },
    setIsCheckingUpdates(state, action: PayloadAction<boolean>) {
      state.isCheckingUpdates = action.payload;
    },
    removeConnectorUpdate(state, action: PayloadAction<string>) {
      state.connectorUpdates = state.connectorUpdates.filter(
        (update) => update.id !== action.payload
      );
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.auth.isLoading = action.payload;
    },
    setAuthenticated(state, action: PayloadAction<{ user: AuthUser; walletAddress: string | null; masterKeySignature?: string | null }>) {
      state.auth.isAuthenticated = true;
      state.auth.isLoading = false;
      state.auth.user = action.payload.user;
      state.auth.walletAddress = action.payload.walletAddress;
      state.auth.masterKeySignature = action.payload.masterKeySignature ?? null;
    },
    clearAuth(state) {
      state.auth.isAuthenticated = false;
      state.auth.isLoading = false;
      state.auth.user = null;
      state.auth.walletAddress = null;
      state.auth.masterKeySignature = null;
    },
    setConnectedApps(state, action: PayloadAction<ConnectedApp[]>) {
      state.connectedApps = action.payload;
    },
    addConnectedApp(state, action: PayloadAction<ConnectedApp>) {
      state.connectedApps.push(action.payload);
    },
    removeConnectedApp(state, action: PayloadAction<string>) {
      state.connectedApps = state.connectedApps.filter(app => app.id !== action.payload);
    },
    setAppConfig(state, action: PayloadAction<Partial<AppConfig>>) {
      state.appConfig = { ...state.appConfig, ...action.payload };
    },
  },
});

export const {
  setCurrentRoute,
  setActiveRunIndex,
  toggleRunVisibility,
  setIsRunLayerVisible,
  updateBreadcrumb,
  setIsMac,
  setPlatforms,
  setConnectedPlatforms,
  setRuns,
  startRun,
  deleteRun,
  updateRunStatus,
  updateExportStatus,
  updateRunLogs,
  updateRunConnected,
  updateRunExportData,
  stopRun,
  stopAllRuns,
  setConnectorUpdates,
  setIsCheckingUpdates,
  removeConnectorUpdate,
  setAuthLoading,
  setAuthenticated,
  clearAuth,
  setConnectedApps,
  addConnectedApp,
  removeConnectedApp,
  setAppConfig,
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
