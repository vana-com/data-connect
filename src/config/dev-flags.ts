const parseEnvFlag = (value: string | undefined) => value === "true"

export const DEV_FLAGS = {
  // .env.local: VITE_USE_TEST_DATA=true
  // Use fixture data for Home connected apps/sources.
  useTestData: parseEnvFlag(import.meta.env.VITE_USE_TEST_DATA),
  // .env.local: VITE_USE_RICKROLL_MOCK=true
  // Force every app open to the RickRoll mock.
  useRickrollMock: parseEnvFlag(import.meta.env.VITE_USE_RICKROLL_MOCK),
  // .env.local: VITE_STRICT_GRANT_PARAM_ALLOWLIST=true
  // Reject deep links with unknown or non-canonical grant params.
  strictGrantParamAllowlist: parseEnvFlag(
    import.meta.env.VITE_STRICT_GRANT_PARAM_ALLOWLIST
  ),
} as const
