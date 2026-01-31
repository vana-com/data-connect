import { AlertCircle } from 'lucide-react';

interface GrantAuthRequiredStateProps {
  appName?: string;
  onLogin: () => void;
  onDecline: () => void;
}

export function GrantAuthRequiredState({ appName, onLogin, onDecline }: GrantAuthRequiredStateProps) {
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
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <AlertCircle style={{ width: '32px', height: '32px', color: '#f59e0b' }} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Authentication Required
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.5' }}>
            To grant data access to <strong>{appName || 'this app'}</strong>, you need
            to sign in to Data Connect first.
          </p>
        </div>

        <button
          onClick={onLogin}
          style={{
            width: '100%',
            padding: '14px',
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
          Sign In to Continue
        </button>

        <button
          onClick={onDecline}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 500,
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1a1a1a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
