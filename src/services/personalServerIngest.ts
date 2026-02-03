const SCOPE_MAP: Record<string, string> = {
  'chatgpt-playwright': 'chatgpt.conversations',
  'chatgpt': 'chatgpt.conversations',
  'instagram-playwright': 'instagram.posts',
  'instagram': 'instagram.posts',
  'linkedin-playwright': 'linkedin.profile',
  'linkedin': 'linkedin.profile',
};

export function getScopeForPlatform(platformId: string): string | null {
  return SCOPE_MAP[platformId] ?? SCOPE_MAP[platformId.toLowerCase()] ?? null;
}

export async function ingestData(port: number, scope: string, data: object): Promise<void> {
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  const res = await tauriFetch(`http://localhost:${port}/v1/data/${scope}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
}
