import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { signTypedData } from './accountApi';

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL || "https://data-gateway.vana.org";

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

// EIP-712 domain and types matching the personal-server library's eip712.ts
// and the gateway's verification logic.
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || "1480");

const SERVER_REGISTRATION_DOMAIN = {
  name: "Vana Data Portability",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: "0x1483B1F634DBA75AeaE60da7f01A679aabd5ee2c",
} as const;

const SERVER_REGISTRATION_TYPES = {
  ServerRegistration: [
    { name: "ownerAddress", type: "address" },
    { name: "serverAddress", type: "address" },
    { name: "publicKey", type: "string" },
    { name: "serverUrl", type: "string" },
  ],
} as const;

export interface RegisterServerResult {
  serverId: string | null;
  alreadyRegistered: boolean;
}

/**
 * Register the personal server with the gateway.
 *
 * 1. Fetches the server's identity (address + publicKey) from /health
 * 2. Signs an EIP-712 ServerRegistration message via account.vana.org/api/sign
 * 3. POSTs the signed registration to the gateway
 */
export async function registerServer(
  port: number,
  masterKeySignature: string,
  ownerAddress: string,
): Promise<RegisterServerResult> {
  const identity = await fetchServerIdentity(port);

  if (!identity.address || !identity.publicKey) {
    throw new Error("Server identity incomplete — missing address or publicKey");
  }

  // If already registered, skip
  if (identity.serverId) {
    return { serverId: identity.serverId, alreadyRegistered: true };
  }

  const serverUrl = `https://${identity.address.toLowerCase()}.server.vana.org`;

  const message = {
    ownerAddress,
    serverAddress: identity.address,
    publicKey: identity.publicKey,
    serverUrl,
  };

  // Privy's server wallet API requires snake_case `primary_type` and strictly
  // rejects the EIP-712 standard `primaryType` as an unrecognized key.
  const typedData = {
    types: SERVER_REGISTRATION_TYPES,
    domain: SERVER_REGISTRATION_DOMAIN,
    primary_type: "ServerRegistration",
    message,
  };

  // Get the owner's signature via account.vana.org/api/sign
  const signature = await signTypedData(masterKeySignature, typedData);

  // POST to gateway
  const res = await tauriFetch(`${GATEWAY_URL}/v1/servers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Web3Signed ${signature}`,
    },
    body: JSON.stringify({
      ownerAddress,
      serverAddress: identity.address,
      publicKey: identity.publicKey,
      serverUrl,
    }),
  });

  // 409 = already registered — treat as success
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    return { serverId: (body as Record<string, unknown>).serverId as string ?? null, alreadyRegistered: true };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway server registration failed (${res.status}): ${text}`);
  }

  const body = await res.json();
  return { serverId: (body as Record<string, unknown>).serverId as string ?? null, alreadyRegistered: false };
}
