import { Text } from "@/components/typography/text"
import { Row, RowDot } from "./row"

/*
  AuthRow job:
  - Show who is currently authenticated for Personal Server actions.
  - Prefer email, then wallet (shortened), else generic "Signed in".

  Why no label popover:
  - "Authorisation" is direct enough in this context.
*/
type AuthIdentityState = "email" | "wallet" | "signed-in"

const TEST_AUTH_IDENTITY: AuthIdentityState | null = "email"
const TEST_ACCOUNT_EMAIL = "you@vana.example"
const TEST_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"

interface AuthRowProps {
  accountEmail?: string | null
  walletAddress?: string | null
  isLast?: boolean
}

function getAuthIdentity(
  accountEmail?: string | null,
  walletAddress?: string | null
): { state: AuthIdentityState; value: string } {
  if (accountEmail) {
    return { state: "email", value: accountEmail }
  }

  if (walletAddress) {
    return { state: "wallet", value: shortenWallet(walletAddress) }
  }

  return { state: "signed-in", value: "Signed in" }
}

export function AuthRow({
  accountEmail,
  walletAddress,
  isLast = false,
}: AuthRowProps) {
  const mockedEmail =
    TEST_AUTH_IDENTITY === "email" ? TEST_ACCOUNT_EMAIL : accountEmail
  const mockedWallet =
    TEST_AUTH_IDENTITY === "wallet" ? TEST_WALLET_ADDRESS : walletAddress
  const previewIdentity = getAuthIdentity(mockedEmail, mockedWallet)
  const label =
    previewIdentity.state === "signed-in"
      ? previewIdentity.value
      : previewIdentity.value
  // `Signed in: ${previewIdentity.value}`?

  return (
    <Row
      label="Authorisation"
      isLast={isLast}
      value={
        <Text as="div" intent="small" dim withIcon>
          <RowDot className="bg-success-foreground" />
          {label}
        </Text>
      }
    />
  )
}

function shortenWallet(walletAddress: string) {
  if (walletAddress.length < 12) return walletAddress
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}
