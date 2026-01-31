import { Check } from 'lucide-react';
import { PlatformIcon } from '../../lib/platformIcons';
import type { Platform } from '../../types';

interface ConnectedSourcesListProps {
  platforms: Platform[];
  isRecentlyCompleted: (platformId: string) => boolean;
}

export function ConnectedSourcesList({ platforms, isRecentlyCompleted }: ConnectedSourcesListProps) {
  if (platforms.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
        Connected sources
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {platforms.map((platform) => {
          const completed = isRecentlyCompleted(platform.id);
          return (
            <div
              key={platform.id}
              style={{
                backgroundColor: 'white',
                border: completed ? '1px solid #22c55e' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: completed ? '#dcfce7' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PlatformIcon name={platform.name} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '15px', marginBottom: '2px' }}>
                  {platform.name}
                </div>
                <div style={{ fontSize: '13px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                  Connected
                </div>
              </div>
              {completed && (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check style={{ width: '14px', height: '14px', color: 'white', strokeWidth: 3 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
