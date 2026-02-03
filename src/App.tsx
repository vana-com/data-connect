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

// Lazy-loaded pages for reduced initial bundle size
const Home = lazy(() => import("./pages/home").then(m => ({ default: m.Home })))
const DataApps = lazy(() =>
  import("./pages/data-apps").then(m => ({ default: m.DataApps }))
)
const Mcp = lazy(() => import("./pages/mcp").then(m => ({ default: m.Mcp })))
const Docs = lazy(() => import("./pages/docs").then(m => ({ default: m.Docs })))
const AppPage = lazy(() => import("./pages/app-page").then(m => ({ default: m.AppPage })))
const Runs = lazy(() => import("./pages/runs").then(m => ({ default: m.Runs })))
const Settings = lazy(() =>
  import("./pages/settings").then(m => ({ default: m.Settings }))
)
const Grant = lazy(() => import("./pages/grant").then(m => ({ default: m.Grant })))

function AppContent() {
  useEvents()
  useInitialize()
  useDeepLink()
  usePersonalServer()

  return (
    <div className="flex h-screen">
      {/* Tauri app shell layout: fixed header, scrollable main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            {/* Routes config: keep @/config/routes.ts in sync when adding/removing routes */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/apps" element={<DataApps />} />
              <Route path="/apps/:appId" element={<AppPage />} />
              <Route path="/mcp" element={<Mcp />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/grant" element={<Grant />} />
              <Route path="/login" element={<InlineLogin />} />
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
  if (location.pathname === "/browser-login") {
    return <BrowserLogin />
  }

  return <AppContent />
}

function App() {
  return (
    <Provider store={store}>
      <PrivyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/browser-login" element={<BrowserLogin />} />
            <Route path="/*" element={<AppRouter />} />
          </Routes>
        </BrowserRouter>
      </PrivyProvider>
    </Provider>
  )
}

export default App
