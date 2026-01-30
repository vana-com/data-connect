import { Loader } from 'lucide-react';

export function GrantLoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Loader
          style={{ width: '48px', height: '48px', color: '#6366f1', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}
        />
        <p style={{ color: '#6b7280', fontSize: '15px' }}>Loading...</p>
      </div>
    </div>
  );
}
