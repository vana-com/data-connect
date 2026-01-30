/**
 * Shared platform icon utilities for displaying connector icons.
 * Used by Home.tsx and ConnectorUpdates.tsx.
 */

/** Platform icon URLs keyed by normalized name */
export const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
  instagram: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
  linkedin: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
};

/**
 * Get the icon URL for a platform by name.
 * Matches against known platform names (case-insensitive, partial match).
 */
export function getPlatformIcon(platformName: string): string | null {
  const name = platformName.toLowerCase();
  if (name.includes('chatgpt')) return PLATFORM_ICONS.chatgpt;
  if (name.includes('instagram')) return PLATFORM_ICONS.instagram;
  if (name.includes('linkedin')) return PLATFORM_ICONS.linkedin;
  return null;
}

interface PlatformIconProps {
  /** Platform name to display icon for */
  name: string;
  /** Icon size in pixels (default: 24) */
  size?: number;
}

/**
 * Platform icon component that displays a platform logo or first-letter fallback.
 */
export function PlatformIcon({ name, size = 24 }: PlatformIconProps) {
  const iconUrl = getPlatformIcon(name);

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
        }}
      />
    );
  }

  // Fallback: show first letter
  const fontSize = Math.round(size * 0.75);
  return (
    <span style={{ fontSize: `${fontSize}px`, fontWeight: 600, color: '#6b7280' }}>
      {name.charAt(0)}
    </span>
  );
}
