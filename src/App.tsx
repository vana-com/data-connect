import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "./state/store"
import { useEvents } from "./hooks/useEvents"
import { useInitialize } from "./hooks/useInitialize"
import { TopNav } from "./components/top-nav"
import { PrivyProvider } from "./components/providers/PrivyProvider"
import { InlineLogin } from "./components/auth/InlineLogin"
import { BrowserLogin } from "./pages/browser-login"
import { useDeepLink } from "./hooks/use-deep-link"
import { usePersonalServer } from "./hooks/usePersonalServer"
import { usePendingApprovalRetry } from "./hooks/usePendingApproval"
import { ROUTES } from "@/config/routes"
import { dotPatternStyle } from "@/components/elements/dot-pattern"
import { LoadingState } from "@/components/elements/loading-state"

// Dev loading debug:
// - Open "/__loading" to render LoadingState directly.

// Lazy-loaded pages for reduced initial bundle size
const Home = lazy(() => import("./pages/home").then(m => ({ default: m.Home })))
const DataApps = lazy(() =>
  import("./pages/data-apps").then(m => ({ default: m.DataApps }))
)
const Mcp = lazy(() => import("./pages/mcp").then(m => ({ default: m.Mcp })))
const Docs = lazy(() => import("./pages/docs").then(m => ({ default: m.Docs })))
const SourceOverview = lazy(() =>
  import("./pages/source").then(m => ({ default: m.SourceOverview }))
)
const Settings = lazy(() =>
  import("./pages/settings").then(m => ({ default: m.Settings }))
)
const Grant = lazy(() =>
  import("./pages/grant").then(m => ({ default: m.Grant }))
)
const Connect = lazy(() =>
  import("./pages/connect").then(m => ({ default: m.Connect }))
)

function AppContent() {
  useEvents()
  useInitialize()
  useDeepLink()
  usePersonalServer()
  usePendingApprovalRetry()

  return (
    <div className="flex h-screen">
      {/* Tauri app shell layout: fixed header, scrollable main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<LoadingState />}>
            {/* Routes config: keep @/config/routes.ts in sync when adding/removing routes */}
            <Routes>
              <Route path={ROUTES.debugLoading} element={<LoadingState />} />
              <Route path={ROUTES.home} element={<Home />} />
              <Route path={ROUTES.apps} element={<DataApps />} />
              <Route path={ROUTES.mcp} element={<Mcp />} />
              <Route path={ROUTES.docs} element={<Docs />} />
              <Route path={ROUTES.source} element={<SourceOverview />} />
              <Route path={ROUTES.settings} element={<Settings />} />
              <Route path={ROUTES.connect} element={<Connect />} />
              <Route path={ROUTES.grant} element={<Grant />} />
              <Route path={ROUTES.login} element={<InlineLogin />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// Router wrapper that handles both app content and standalone browser login
function AppRouter() {
  const location = useLocation()

  // Browser login page is standalone (for external browser auth flow)
  if (location.pathname === ROUTES.browserLogin) {
    return <BrowserLogin />
  }

  return <AppContent />
}

function App() {
  return (
    <Provider store={store}>
      <PrivyProvider>
        <div style={dotPatternStyle} className="min-h-screen">
          <BrowserRouter>
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path={ROUTES.browserLogin} element={<BrowserLogin />} />
                <Route path="/*" element={<AppRouter />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </div>
      </PrivyProvider>
    </Provider>
  )
}

export default App
