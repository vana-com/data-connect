const parseEnvFlag = (value: string | undefined) => value === "true"

export const DEV_FLAGS = {
  // .env.local: VITE_USE_TEST_DATA=true
  // Use fixture data for Home connected apps/sources.
  useTestData: parseEnvFlag(import.meta.env.VITE_USE_TEST_DATA),
  // .env.local: VITE_USE_RICKROLL_MOCK=true
  // Force every app open to the RickRoll mock.
  useRickrollMock: parseEnvFlag(import.meta.env.VITE_USE_RICKROLL_MOCK),
} as const
