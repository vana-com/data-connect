import { Text } from "@/components/typography/text"

interface GrantScopesListProps {
  scopes?: string[]
}

export function GrantScopesList({ scopes }: GrantScopesListProps) {
  const hasScopes = Boolean(scopes && scopes.length > 0)

  return (
    <div className="space-y-3">
      <Text as="h3" intent="small" weight="semi">
        Permissions Requested:
      </Text>
      <ul className="space-y-1 pl-5">
        {hasScopes ? (
          scopes?.map(scope => (
            <Text key={scope} as="li" intent="small" color="mutedForeground">
              {scope}
            </Text>
          ))
        ) : (
          <Text as="li" intent="small" color="mutedForeground">
            No specific permissions requested
          </Text>
        )}
      </ul>
    </div>
  )
}
