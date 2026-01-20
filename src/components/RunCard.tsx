import { useState } from 'react';
import {
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Folder,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { Run } from '../types';

interface RunCardProps {
  run: Run;
  onStop: (runId: string) => void;
}

export function RunCard({ run, onStop }: RunCardProps) {
  const [showConversations, setShowConversations] = useState(false);

  const getStatusIcon = () => {
    switch (run.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'stopped':
        return <Square className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (run.statusMessage) {
      return run.statusMessage;
    }
    switch (run.status) {
      case 'running':
        return 'Running...';
      case 'success':
        return run.itemsExported
          ? `Completed - ${run.itemsExported} items`
          : 'Completed';
      case 'error':
        return 'Failed';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const openExportFolder = async () => {
    if (run.exportPath) {
      try {
        await invoke('open_folder', { path: run.exportPath });
      } catch (error) {
        console.error('Failed to open folder:', error);
      }
    }
  };

  const conversations = run.exportData?.conversations || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-gray-900 dark:text-white">
              {run.name}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {run.company}
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {getStatusText()}
          </span>
          {run.itemsExported !== undefined && run.status === 'success' && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {run.itemsExported} conversations exported
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for running status */}
      {run.status === 'running' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Started: {formatDate(run.startDate)}</div>
        {run.endDate && <div>Ended: {formatDate(run.endDate)}</div>}
        {run.exportSize ? <div>Size: {formatSize(run.exportSize)}</div> : null}
      </div>

      {/* Conversations list */}
      {conversations.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowConversations(!showConversations)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <MessageSquare className="w-4 h-4" />
            {showConversations ? 'Hide' : 'Show'} {conversations.length} conversations
            {showConversations ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showConversations && (
            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
              {conversations.map((conv, index) => (
                <div
                  key={conv.id}
                  className={`px-3 py-2 text-sm ${
                    index % 2 === 0
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conv.url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {run.logs && (
        <div className="mt-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {run.logs}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {run.status === 'running' && (
          <button
            onClick={() => onStop(run.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-sm transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        )}
        {run.exportPath && (
          <button
            onClick={openExportFolder}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded text-sm transition-colors"
          >
            <Folder className="w-3 h-3" />
            Open Folder
          </button>
        )}
      </div>
    </div>
  );
}
