import { Play, CheckCircle, AlertCircle } from 'lucide-react';
import type { Platform } from '../types';

interface PlatformCardProps {
  platform: Platform;
  isConnected: boolean;
  onExport: (platform: Platform) => void;
}

export function PlatformCard({
  platform,
  isConnected,
  onExport,
}: PlatformCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-600 dark:text-gray-300">
              {platform.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {platform.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {platform.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <AlertCircle className="w-4 h-4" />
              Not connected
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {platform.description}
      </p>
      <div className="mt-4 flex items-center justify-between">
        {platform.exportFrequency && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Export: {platform.exportFrequency}
          </span>
        )}
        <button
          onClick={() => onExport(platform)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
}
