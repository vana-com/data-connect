import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { startBrowserAuthFlow } from '@/lib/start-browser-auth';

export function InlineLogin() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f5f5f7',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            Welcome to Data Connect
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Sign in in your browser to continue</p>
        </div>

        {error ? (
          <p style={{ marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>{error}</p>
        ) : null}

        <button
          onClick={async () => {
            setError(null);
            const result = await startBrowserAuthFlow();
            if (!result) {
              setError('Failed to start sign-in flow. Please try again.');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '14px 16px',
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
          <ExternalLink style={{ width: '20px', height: '20px' }} />
          Sign in with Vana Passport
        </button>

        <p
          style={{
            marginTop: '16px',
            fontSize: '13px',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          You will finish sign-in in the external auth flow.
        </p>
      </div>
    </div>
  );
}
