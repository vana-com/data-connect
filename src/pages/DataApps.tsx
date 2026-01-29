import { ExternalLink, Lock, Clock } from 'lucide-react';

interface MockApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: 'live' | 'coming-soon';
  dataRequired: string[];
}

const mockApps: MockApp[] = [
  {
    id: 'rickroll',
    name: 'RickRoll Facts',
    description: 'Discover fun facts from your ChatGPT conversations',
    icon: '🎵',
    category: 'Demo',
    status: 'live',
    dataRequired: ['ChatGPT'],
  },
  {
    id: 'vana-trainer',
    name: 'Vana Trainer',
    description: 'Train AI models on your personal data',
    icon: '🤖',
    category: 'AI Training',
    status: 'coming-soon',
    dataRequired: ['ChatGPT', 'Reddit', 'Twitter'],
  },
  {
    id: 'data-broker',
    name: 'Data Marketplace',
    description: 'Sell access to your data securely',
    icon: '💎',
    category: 'Marketplace',
    status: 'coming-soon',
    dataRequired: ['Any'],
  },
  {
    id: 'personal-assistant',
    name: 'Personal AI Assistant',
    description: 'Get personalized insights from your data',
    icon: '🧠',
    category: 'Productivity',
    status: 'coming-soon',
    dataRequired: ['Gmail', 'Calendar', 'Notion'],
  },
  {
    id: 'social-analyzer',
    name: 'Social Insights',
    description: 'Analyze your social media presence',
    icon: '📊',
    category: 'Analytics',
    status: 'coming-soon',
    dataRequired: ['Twitter', 'LinkedIn', 'Reddit'],
  },
  {
    id: 'health-tracker',
    name: 'Health Data Sync',
    description: 'Aggregate and analyze health metrics',
    icon: '❤️',
    category: 'Health',
    status: 'coming-soon',
    dataRequired: ['Fitbit', 'Apple Health'],
  },
  {
    id: 'content-creator',
    name: 'Content Vault',
    description: 'Organize and monetize your content',
    icon: '📁',
    category: 'Media',
    status: 'coming-soon',
    dataRequired: ['YouTube', 'Instagram', 'TikTok'],
  },
];

export function DataApps() {
  const liveApps = mockApps.filter((app) => app.status === 'live');
  const comingSoonApps = mockApps.filter((app) => app.status === 'coming-soon');

  return (
    <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#f5f5f7' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
          Data Apps
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
          Discover applications that can work with your data
        </p>

        {/* Live Apps */}
        {liveApps.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '20px' }}>
              Available Now
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {liveApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </section>
        )}

        {/* Coming Soon */}
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '20px' }}>
            Coming Soon
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {comingSoonApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>

        {/* Build with Vana CTA */}
        <section
          style={{
            marginTop: '48px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            Build your own data app
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            Create applications that leverage the Vana Data Portability Protocol
          </p>
          <a
            href="https://docs.vana.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#6366f1',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366f1';
            }}
          >
            View Documentation
            <ExternalLink style={{ width: '16px', height: '16px' }} />
          </a>
        </section>
      </div>
    </div>
  );
}

function AppCard({ app }: { app: MockApp }) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        opacity: app.status === 'coming-soon' ? 0.8 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            flexShrink: 0,
          }}
        >
          {app.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
              {app.name}
            </h3>
            {app.status === 'coming-soon' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                }}
              >
                <Clock style={{ width: '12px', height: '12px' }} />
                Coming Soon
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{app.description}</p>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#6366f1',
              backgroundColor: '#eef2ff',
              borderRadius: '4px',
            }}
          >
            {app.category}
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Lock style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Data required:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {app.dataRequired.map((data) => (
            <span
              key={data}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
              }}
            >
              {data}
            </span>
          ))}
        </div>
      </div>

      {app.status === 'coming-soon' ? (
        <button
          disabled
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#9ca3af',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'not-allowed',
          }}
        >
          Connect
        </button>
      ) : (
        <button
          onClick={() => (window.location.href = `/apps/${app.id}`)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: '#6366f1',
            border: 'none',
            borderRadius: '8px',
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
          Open App
        </button>
      )}
    </div>
  );
}
