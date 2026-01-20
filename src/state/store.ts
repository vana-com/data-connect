import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Run, Platform, AppState, ExportedData, ProgressPhase } from '../types';

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
      }>
    ) {
      const run = state.runs.find((r) => r.id === action.payload.runId);
      if (run) {
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
  startRun,
  deleteRun,
  updateRunStatus,
  updateExportStatus,
  updateRunLogs,
  updateRunConnected,
  updateRunExportData,
  stopRun,
  stopAllRuns,
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
