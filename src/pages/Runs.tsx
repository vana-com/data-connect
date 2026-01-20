import { useSelector } from 'react-redux';
import { useConnector } from '../hooks/useConnector';
import { RunCard } from '../components/RunCard';
import type { RootState } from '../state/store';
import { Activity } from 'lucide-react';

export function Runs() {
  const runs = useSelector((state: RootState) => state.app.runs);
  const { stopExport } = useConnector();

  const sortedRuns = [...runs].sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const activeRuns = sortedRuns.filter((run) => run.status === 'running');
  const completedRuns = sortedRuns.filter((run) => run.status !== 'running');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Export Runs
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage your data export runs
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No export runs yet. Start an export from the Platforms page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRuns.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Active Runs ({activeRuns.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRuns.map((run) => (
                  <RunCard key={run.id} run={run} onStop={stopExport} />
                ))}
              </div>
            </div>
          )}

          {completedRuns.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Completed Runs ({completedRuns.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedRuns.map((run) => (
                  <RunCard key={run.id} run={run} onStop={stopExport} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
