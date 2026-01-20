import { NavLink } from 'react-router-dom';
import { Database, FolderOpen, Settings, Activity } from 'lucide-react';

export function TopNav() {
  const navLinkStyle = (isActive: boolean) => ({
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    backgroundColor: isActive ? '#f3f4f6' : 'transparent',
    color: isActive ? '#1a1a1a' : '#6b7280',
  });

  return (
    <header
      data-tauri-drag-region
      style={{
        height: '48px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '80px', // Space for macOS traffic lights
        paddingRight: '16px',
      }}
    >
      {/* Logo/Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Database style={{ width: '20px', height: '20px', color: '#6366f1' }} />
        <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px' }}>DataBridge</span>
      </div>

      {/* Navigation Icons */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <NavLink
          to="/"
          title="Data Sources"
          style={({ isActive }) => navLinkStyle(isActive)}
        >
          <FolderOpen style={{ width: '20px', height: '20px' }} />
        </NavLink>
        <NavLink
          to="/runs"
          title="Export History"
          style={({ isActive }) => navLinkStyle(isActive)}
        >
          <Activity style={{ width: '20px', height: '20px' }} />
        </NavLink>
        <NavLink
          to="/settings"
          title="Settings"
          style={({ isActive }) => navLinkStyle(isActive)}
        >
          <Settings style={{ width: '20px', height: '20px' }} />
        </NavLink>
      </nav>
    </header>
  );
}
