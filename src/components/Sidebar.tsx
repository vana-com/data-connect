import { Home, Activity, Settings, Database } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Database className="w-8 h-8 text-primary-600" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            DataBridge
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Platforms" />
        <NavItem
          to="/runs"
          icon={<Activity className="w-5 h-5" />}
          label="Export Runs"
        />
        <NavItem
          to="/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
        />
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          DataBridge v0.1.0
        </div>
      </div>
    </aside>
  );
}
