import { usePlatforms } from '../hooks/usePlatforms';
import { useConnector } from '../hooks/useConnector';
import { PlatformCard } from '../components/PlatformCard';
import type { Platform } from '../types';
import { RefreshCw } from 'lucide-react';

export function Home() {
  const {
    platforms,
    loadPlatforms,
    isPlatformConnected,
  } = usePlatforms();
  const { startExport } = useConnector();

  const handleExport = async (platform: Platform) => {
    await startExport(platform);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Platforms
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Export your data from connected platforms
          </p>
        </div>
        <button
          onClick={loadPlatforms}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {platforms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No platforms available. Add connectors to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              isConnected={isPlatformConnected(platform.id)}
              onExport={handleExport}
            />
          ))}
        </div>
      )}
    </div>
  );
}
