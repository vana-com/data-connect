import { useState } from 'react';
import { Database, RefreshCw, Sparkles } from 'lucide-react';
import { useRickRollData } from './index';

export function RickRollApp() {
  const { data, loading, error, funFacts, hasData } = useRickRollData();
  const [showAllFacts, setShowAllFacts] = useState(false);

  const handleRequestAccess = () => {
    // Open deep link to grant flow
    // For demo purposes, use a mock session ID
    const sessionId = 'demo-session-' + Date.now();
    window.location.href = `dataconnect://?sessionId=${sessionId}&appId=rickroll`;
  };

  const hasAccess = true; // In real implementation, check if this app is authorized

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', padding: '48px' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '32px' }}>🎵</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            RickRoll Facts
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.5' }}>
            Discover fun and interesting facts from your ChatGPT conversations
          </p>

          <div
            style={{
              padding: '24px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database style={{ width: '16px', height: '16px' }} />
              Requires access to your ChatGPT export data
            </p>
            <p style={{ fontSize: '13px', color: '#78350f', margin: 0 }}>
              This app needs permission to read your exported ChatGPT conversations to generate fun facts.
            </p>
          </div>

          <button
            onClick={handleRequestAccess}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            Connect Your Data
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f7',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: '12px',
              border: '3px solid #fee2fe',
              borderTopColor: '#f87171',
              borderRightColor: '#f87171',
              borderBottomColor: '#f87171',
              borderLeftColor: '#f87171',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ color: '#6b7280' }}>Loading your ChatGPT data...</p>
        </div>
      </div>
    );
  }

  if (error || !hasData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', padding: '48px' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
          }}
        >
          <Database style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            No Data Found
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
            {error || 'Could not find your ChatGPT export data. Please export your ChatGPT conversations first, then grant this app access.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6366f1',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const displayFacts = showAllFacts ? funFacts : funFacts.slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', padding: '48px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '28px' }}>🎵</span>
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
              RickRoll Facts
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Your ChatGPT conversation insights</p>
          </div>
        </div>

        {/* Fun Facts */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <Sparkles style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a' }}>Fun Facts</h2>
            </div>

            {displayFacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayFacts.map((fact, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      lineHeight: '1.5',
                    }}
                  >
                    {fact}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No facts generated</p>
            )}

            {funFacts.length > 3 && !showAllFacts && (
              <button
                onClick={() => setShowAllFacts(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#6366f1',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Show all {funFacts.length} facts
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {data && data.conversations && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
              Your Stats
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{data.totalConversations || data.conversations.length}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Conversations</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>
                  {data.conversations.reduce((sum, conv) => sum + conv.messages.length, 0)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Messages</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
                  {data.conversations.reduce((sum, conv) => sum + conv.messages.join('').length, 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Characters</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', marginTop: '32px' }}>
          Data stays on your device. This app only reads your exported ChatGPT data.
        </p>
      </div>
    </div>
  );
}
