import { Text } from "@/components/typography/text"

interface GrantWalletInfoProps {
  walletAddress: string | null
}

export function GrantWalletInfo({ walletAddress }: GrantWalletInfoProps) {
  const shortWalletAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-button bg-muted px-3 py-2">
      <Text as="span" intent="small" color="mutedForeground">
        Signing as:
      </Text>
      {shortWalletAddress ? (
        <Text as="span" intent="small" color="foreground" mono>
          {shortWalletAddress}
        </Text>
      ) : (
        <Text as="span" intent="small" color="mutedForeground">
          Wallet not connected
        </Text>
      )}
    </div>
  )
}
