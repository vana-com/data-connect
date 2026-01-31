import { CheckCircle } from 'lucide-react';

interface GrantSuccessStateProps {
  appName?: string;
  onDone: () => void;
}

export function GrantSuccessState({ appName, onDone }: GrantSuccessStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          textAlign: 'center',
        }}
      >
        <CheckCircle style={{ width: '64px', height: '64px', color: '#22c55e', margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
          Access Granted
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '8px' }}>
          You've successfully granted <strong>{appName || 'the app'}</strong> access to
          your data.
        </p>
        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
          You can manage this connection in Settings anytime.
        </p>
        <button
          onClick={onDone}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: '#6366f1',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1';
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
