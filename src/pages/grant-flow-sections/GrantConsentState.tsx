import { AlertCircle, Loader } from 'lucide-react';

interface GrantSession {
  appName: string;
  appIcon?: string;
  scopes: string[];
}

interface GrantConsentStateProps {
  session: GrantSession;
  walletAddress: string;
  currentStep: 1 | 2 | 3;
  isApproving: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

export function GrantConsentState({
  session,
  walletAddress,
  currentStep,
  isApproving,
  onApprove,
  onDecline,
}: GrantConsentStateProps) {
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
          maxWidth: '520px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map((step) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? '#6366f1' : '#e5e7eb',
                  color: currentStep >= step ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  style={{
                    width: '24px',
                    height: '2px',
                    backgroundColor: currentStep > step ? '#6366f1' : '#e5e7eb',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* App Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: session.appIcon ? 'transparent' : '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
            }}
          >
            {session.appIcon || '🔗'}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
              {session.appName || 'Unknown App'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>is requesting access to your data</p>
          </div>
        </div>

        {/* Scope Details */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Permissions requested:
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6b7280' }}>
            {session.scopes.map((scope) => (
              <li key={scope} style={{ marginBottom: '4px' }}>
                {scope}
              </li>
            )) || <li>No specific permissions requested</li>}
          </ul>
        </div>

        {/* Wallet Info */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#6b7280' }}>Signing as: </span>
          <span style={{ color: '#1a1a1a', fontFamily: 'monospace' }}>
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </span>
        </div>

        {/* Warning */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <AlertCircle style={{ width: '18px', height: '18px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
            By approving, you authorize this app to access the specified data. You can revoke this access
            anytime from Settings.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onDecline}
            disabled={isApproving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              cursor: isApproving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Decline
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: isApproving ? '#9ca3af' : '#6366f1',
              border: 'none',
              borderRadius: '10px',
              cursor: isApproving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }
            }}
            onMouseLeave={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }
            }}
          >
            {isApproving ? (
              <>
                <Loader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
