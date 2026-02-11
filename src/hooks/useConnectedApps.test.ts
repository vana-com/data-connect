import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useConnectedApps } from "./useConnectedApps"

const mockDispatch = vi.fn()
let mockState = {
  app: {
    connectedApps: [] as Array<{
      id: string
      name: string
      permissions: string[]
      connectedAt: string
      icon?: string
    }>,
    auth: { isAuthenticated: false },
  },
}

const mockListGrants = vi.fn()
const mockRevokeGrant = vi.fn()

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}))

vi.mock("../services/personalServer", () => ({
  listGrants: (...args: unknown[]) => mockListGrants(...args),
  revokeGrant: (...args: unknown[]) => mockRevokeGrant(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    app: {
      connectedApps: [],
      auth: { isAuthenticated: true },
    },
  }
})

describe("useConnectedApps", () => {
  describe("fetchConnectedApps", () => {
    it("fetches grants and dispatches setConnectedApps", async () => {
      mockListGrants.mockResolvedValue([
        {
          grantId: "grant-1",
          granteeAddress: "0xabcdef1234567890",
          scopes: ["chatgpt.conversations"],
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ])

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.fetchConnectedApps(8080, "dev-token")
      })

      expect(mockListGrants).toHaveBeenCalledWith(8080, "dev-token")
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/setConnectedApps",
        payload: [
          {
            id: "grant-1",
            name: "App 0xabcd…7890",
            permissions: ["chatgpt.conversations"],
            connectedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      })
    })

    it("filters out revoked grants", async () => {
      mockListGrants.mockResolvedValue([
        {
          grantId: "active-grant",
          granteeAddress: "0xaaaaaa1111111111",
          scopes: ["chatgpt.conversations"],
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        {
          grantId: "revoked-grant",
          granteeAddress: "0xbbbbbb2222222222",
          scopes: ["chatgpt.conversations"],
          createdAt: "2025-01-01T00:00:00.000Z",
          revokedAt: "2025-06-01T00:00:00.000Z",
        },
      ])

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.fetchConnectedApps(8080)
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/setConnectedApps",
        payload: [
          expect.objectContaining({ id: "active-grant" }),
        ],
      })
    })

    it("does not fetch when port is null", async () => {
      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.fetchConnectedApps(null)
      })

      expect(mockListGrants).not.toHaveBeenCalled()
    })

    it("does not fetch when not authenticated", async () => {
      mockState.app.auth.isAuthenticated = false

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.fetchConnectedApps(8080)
      })

      expect(mockListGrants).not.toHaveBeenCalled()
    })

    it("handles fetch errors gracefully", async () => {
      mockListGrants.mockRejectedValue(new Error("Server unreachable"))
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.fetchConnectedApps(8080)
      })

      // Should not throw, should log warning
      expect(consoleSpy).toHaveBeenCalledWith(
        "[useConnectedApps] Failed to fetch grants:",
        expect.any(Error)
      )
      // Should not dispatch setConnectedApps on failure
      expect(mockDispatch).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe("removeApp", () => {
    it("optimistically removes and calls revokeGrant", async () => {
      mockState.app.connectedApps = [
        {
          id: "grant-to-revoke",
          name: "Test App",
          permissions: ["chatgpt.conversations"],
          connectedAt: "2025-01-01T00:00:00.000Z",
        },
      ]
      mockRevokeGrant.mockResolvedValue(undefined)

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.removeApp("grant-to-revoke", 8080)
      })

      // Should optimistically remove
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/removeConnectedApp",
        payload: "grant-to-revoke",
      })
      // Should call server
      expect(mockRevokeGrant).toHaveBeenCalledWith(8080, "grant-to-revoke")
    })

    it("rolls back optimistic removal when revokeGrant fails", async () => {
      const appToRevoke = {
        id: "grant-fail",
        name: "Test App",
        permissions: ["chatgpt.conversations"],
        connectedAt: "2025-01-01T00:00:00.000Z",
      }
      mockState.app.connectedApps = [appToRevoke]
      mockRevokeGrant.mockRejectedValue(new Error("Server error"))
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.removeApp("grant-fail", 8080)
      })

      // First call: optimistic remove
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/removeConnectedApp",
        payload: "grant-fail",
      })
      // Second call: roll back by re-adding the app
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/addConnectedApp",
        payload: appToRevoke,
      })
      consoleSpy.mockRestore()
    })

    it("skips server call when port is null", async () => {
      mockState.app.connectedApps = [
        {
          id: "grant-no-port",
          name: "Test App",
          permissions: ["chatgpt.conversations"],
          connectedAt: "2025-01-01T00:00:00.000Z",
        },
      ]

      const { result } = renderHook(() => useConnectedApps())

      await act(async () => {
        await result.current.removeApp("grant-no-port", null)
      })

      // Should still dispatch optimistic removal
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "app/removeConnectedApp",
        payload: "grant-no-port",
      })
      // Should NOT call revokeGrant
      expect(mockRevokeGrant).not.toHaveBeenCalled()
    })
  })
})
