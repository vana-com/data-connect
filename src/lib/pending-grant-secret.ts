const PENDING_GRANT_SECRET_TTL_MS = 1000 * 60 * 10; // 10 minutes

type PendingSecretRecord = {
  secret: string;
  createdAtMs: number;
};

// Process-scoped ephemeral state:
// - In-memory only (never persisted to URL/localStorage/disk)
// - Cleared on full app restart/process exit
// - Used only to bridge same-process auth redirects safely
const pendingGrantSecrets = new Map<string, PendingSecretRecord>();

function isExpired(record: PendingSecretRecord): boolean {
  return Date.now() - record.createdAtMs > PENDING_GRANT_SECRET_TTL_MS;
}

export function stashPendingGrantSecret(
  sessionId: string | undefined,
  secret: string | undefined
): void {
  if (!sessionId || !secret) return;
  pendingGrantSecrets.set(sessionId, {
    secret,
    createdAtMs: Date.now(),
  });
}

export function consumePendingGrantSecret(
  sessionId: string | undefined
): string | undefined {
  if (!sessionId) return undefined;
  const record = pendingGrantSecrets.get(sessionId);
  if (!record) return undefined;
  pendingGrantSecrets.delete(sessionId);
  if (isExpired(record)) return undefined;
  return record.secret;
}

export function hasPendingGrantSecret(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const record = pendingGrantSecrets.get(sessionId);
  if (!record) return false;
  if (isExpired(record)) {
    pendingGrantSecrets.delete(sessionId);
    return false;
  }
  return true;
}

export function clearPendingGrantSecret(sessionId: string | undefined): void {
  if (!sessionId) return;
  pendingGrantSecrets.delete(sessionId);
}

export function __unsafeClearAllPendingGrantSecretsForTests(): void {
  pendingGrantSecrets.clear();
}
