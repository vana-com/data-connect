import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { useEvents } from './hooks/useEvents';
import { useInitialize } from './hooks/useInitialize';
import { TopNav } from './components/TopNav';
import { BrowserProvider } from './context/BrowserContext';
import { PrivyProvider } from './components/providers/PrivyProvider';
import { Home } from './pages/Home';
import { Runs } from './pages/Runs';
import { Settings } from './pages/Settings';
import { DataApps } from './pages/DataApps';
import { GrantFlow } from './pages/GrantFlow';
import { InlineLogin } from './components/auth/InlineLogin';
import { useDeepLink } from './hooks/useDeepLink';

function AppContent() {
  useEvents();
  useInitialize();
  useDeepLink();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f5f5f7',
      }}
    >
      {/* Accent strip */}
      <div
        style={{
          width: '4px',
          background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)',
          flexShrink: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TopNav />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apps" element={<DataApps />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/grant" element={<GrantFlow />} />
            <Route path="/login" element={<InlineLogin />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PrivyProvider>
        <BrowserProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </BrowserProvider>
      </PrivyProvider>
    </Provider>
  );
}

export default App;
