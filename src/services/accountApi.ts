import type { Runtime } from "@/lib/runtime"

const ACCOUNT_URL =
  import.meta.env.VITE_ACCOUNT_URL || "https://account.vana.org"

export async function signMessage(
  runtime: Runtime,
  masterKeySignature: string,
  message: string
): Promise<string> {
  const res = await runtime.fetch(`${ACCOUNT_URL}/api/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterKeySignature,
      message,
      type: "personal_sign",
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Sign failed (${res.status}): ${text}`)
  }
  const { signature } = await res.json()
  return signature
}

export async function signTypedData(
  runtime: Runtime,
  masterKeySignature: string,
  typedData: Record<string, unknown>
): Promise<string> {
  const res = await runtime.fetch(`${ACCOUNT_URL}/api/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterKeySignature,
      typedData,
      type: "eth_signTypedData_v4",
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Sign failed (${res.status}): ${text}`)
  }
  const { signature } = await res.json()
  return signature
}
