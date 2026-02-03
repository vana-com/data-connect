import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface ServerIdentity {
  address: string;
  publicKey: string;
  serverId: string | null;
}

export async function fetchServerIdentity(port: number): Promise<ServerIdentity> {
  const res = await tauriFetch(`http://localhost:${port}/health`);
  if (!res.ok) throw new Error(`Server health check failed: ${res.status}`);
  const data = await res.json();
  return {
    address: data.identity?.address ?? data.address,
    publicKey: data.identity?.publicKey ?? data.publicKey,
    serverId: data.identity?.serverId ?? data.serverId ?? null,
  };
}
