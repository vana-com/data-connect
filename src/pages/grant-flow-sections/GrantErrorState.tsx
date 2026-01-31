import { XCircle } from 'lucide-react';

interface GrantErrorStateProps {
  error?: string;
  onNavigate: () => void;
}

export function GrantErrorState({ error, onNavigate }: GrantErrorStateProps) {
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
        <XCircle style={{ width: '64px', height: '64px', color: '#ef4444', margin: '0 auto 20px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={onNavigate}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: '#1a1a1a',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1a1a1a';
          }}
        >
          Go to Your Data
        </button>
      </div>
    </div>
  );
}
