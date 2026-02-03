import { describe, expect, it, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { BrowserLogin } from "./index"

const mockUsePrivy = vi.fn()
const mockUseWallets = vi.fn()
const mockUseLoginWithOAuth = vi.fn()
const mockUseLoginWithEmail = vi.fn()
const mockUseCreateWallet = vi.fn()

vi.mock("react-router", async () => {
  const actual = await vi.importActual<object>("react-router")
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("callbackPort=3456")],
  }
})

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => mockUsePrivy(),
  useWallets: () => mockUseWallets(),
  useLoginWithOAuth: (opts: { onComplete?: () => void; onError?: () => void }) => {
    mockUseLoginWithOAuth(opts)
    return {
      initOAuth: vi.fn(),
      state: { status: "initial" },
    }
  },
  useLoginWithEmail: (opts: { onComplete?: () => void; onError?: () => void }) => {
    mockUseLoginWithEmail(opts)
    return {
      sendCode: vi.fn(),
      loginWithCode: vi.fn(),
      state: { status: "initial" },
    }
  },
  useCreateWallet: (opts: { onSuccess?: () => void; onError?: () => void }) => {
    mockUseCreateWallet(opts)
    return {
      createWallet: vi.fn(),
    }
  },
}))

const renderBrowserLogin = () => {
  const router = createMemoryRouter([{ path: "/", element: <BrowserLogin /> }], {
    initialEntries: ["/?callbackPort=3456"],
  })

  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePrivy.mockReturnValue({
    authenticated: false,
    user: null,
    ready: true,
  })
  mockUseWallets.mockReturnValue({
    wallets: [],
  })
})

describe("BrowserLogin", () => {
  it("shows loading state when Privy is not ready", () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      user: null,
      ready: false,
    })

    renderBrowserLogin()

    expect(screen.getByText("Initializing...")).toBeTruthy()
  })

  it("shows login form when Privy is ready and not authenticated", () => {
    renderBrowserLogin()

    expect(screen.getByText("Welcome to Data Connect")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeTruthy()
  })

  it("shows email input field for email login", () => {
    renderBrowserLogin()

    // Use getAllBy since StrictMode may render multiple elements
    const emailInputs = screen.getAllByPlaceholderText("you@example.com")
    expect(emailInputs.length).toBeGreaterThan(0)
  })

  it("renders successfully when authenticated", () => {
    mockUsePrivy.mockReturnValue({
      authenticated: true,
      user: {
        id: "user-123",
        email: { address: "test@example.com" },
        linkedAccounts: [],
      },
      ready: true,
    })

    const { container } = renderBrowserLogin()

    // Component should render without crashing
    expect(container.textContent).toBeTruthy()
  })
})
