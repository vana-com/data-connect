import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { useEvents } from './hooks/useEvents';
import { TopNav } from './components/TopNav';
import { Home } from './pages/Home';
import { Runs } from './pages/Runs';
import { Settings } from './pages/Settings';

function AppContent() {
  useEvents();

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
            <Route path="/runs" element={<Runs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
