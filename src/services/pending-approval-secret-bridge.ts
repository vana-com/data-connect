const pendingApprovalSecrets = new Map<string, string>()

export function setPendingApprovalSecret(sessionId: string, secret: string): void {
  pendingApprovalSecrets.set(sessionId, secret)
}

export function getPendingApprovalSecret(sessionId: string): string | null {
  return pendingApprovalSecrets.get(sessionId) ?? null
}

export function clearPendingApprovalSecret(sessionId: string): void {
  pendingApprovalSecrets.delete(sessionId)
}
