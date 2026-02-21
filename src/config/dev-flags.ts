const parseEnvFlag = (value: string | undefined) => value === "true"
const isTestMode = import.meta.env.MODE === "test"

export const DEV_FLAGS = {
  // .env.local: VITE_USE_HOME_TEST_FIXTURES=true
  // Use fixture data for Home connected apps/sources.
  useHomeTestFixtures: parseEnvFlag(import.meta.env.VITE_USE_HOME_TEST_FIXTURES),

  // .env.local: VITE_USE_SETTINGS_UI_MOCKS=true
  // Enable mocked/preview-only Settings UI states (safe default: false).
  useSettingsUiMocks:
    !isTestMode && parseEnvFlag(import.meta.env.VITE_USE_SETTINGS_UI_MOCKS),

  // .env.local: VITE_USE_HOME_CONNECTING_PREVIEW=true
  // Enable Home "connecting card" debug preview overrides (safe default: false).
  useHomeConnectingPreview:
    !isTestMode && parseEnvFlag(import.meta.env.VITE_USE_HOME_CONNECTING_PREVIEW),
} as const
