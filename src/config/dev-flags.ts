const parseEnvFlag = (value: string | undefined) => value === "true"
const isTestMode = import.meta.env.MODE === "test"

export const DEV_FLAGS = {
  // .env.local: VITE_USE_TEST_DATA=true
  // Use fixture data for Home connected apps/sources.
  useTestData: parseEnvFlag(import.meta.env.VITE_USE_TEST_DATA),

  // .env.local: VITE_USE_SETTINGS_UI_MOCKS=true
  // Enable mocked/preview-only Settings UI states (safe default: false).
  useSettingsUiMocks:
    !isTestMode && parseEnvFlag(import.meta.env.VITE_USE_SETTINGS_UI_MOCKS),
} as const
