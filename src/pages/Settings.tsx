import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Folder, ExternalLink } from 'lucide-react';

export function Settings() {
  const [dataPath, setDataPath] = useState<string>('');

  useEffect(() => {
    invoke<string>('get_user_data_path').then((path) => {
      setDataPath(path);
    });
  }, []);

  const openDataFolder = async () => {
    try {
      await invoke('open_folder', { path: dataPath });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure DataBridge preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            Data Storage
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                Export Data Location
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded text-sm text-gray-700 dark:text-gray-300 truncate">
                  {dataPath}
                </code>
                <button
                  onClick={openDataFolder}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded transition-colors"
                >
                  <Folder className="w-4 h-4" />
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            About
          </h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>Version</span>
              <span className="text-gray-400">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Framework</span>
              <span className="text-gray-400">Tauri v2</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            Resources
          </h2>
          <div className="space-y-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <ExternalLink className="w-4 h-4" />
              GitHub Repository
            </a>
            <a
              href="https://docs.databridge.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <ExternalLink className="w-4 h-4" />
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
