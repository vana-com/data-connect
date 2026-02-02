import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "./state/store"
import { useEvents } from "./hooks/useEvents"
import { useInitialize } from "./hooks/useInitialize"
import { TopNav } from "./components/top-nav"
import { BrowserProvider } from "./context/BrowserContext"
import { PrivyProvider } from "./components/providers/PrivyProvider"
import { InlineLogin } from "./components/auth/InlineLogin"
import { BrowserLogin } from "./pages/BrowserLogin"
import { useDeepLink } from "./hooks/useDeepLink"
import { usePersonalServer } from "./hooks/usePersonalServer"

// Lazy-loaded pages for reduced initial bundle size
const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })))
const DataApps = lazy(() =>
  import("./pages/DataApps").then(m => ({ default: m.DataApps }))
)
const RickRollAppPage = lazy(() =>
  import("./pages/RickRollApp").then(m => ({ default: m.RickRollAppPage }))
)
const Runs = lazy(() => import("./pages/Runs").then(m => ({ default: m.Runs })))
const Settings = lazy(() =>
  import("./pages/Settings").then(m => ({ default: m.Settings }))
)
const GrantFlow = lazy(() =>
  import("./pages/GrantFlow").then(m => ({ default: m.GrantFlow }))
)

function AppContent() {
  useEvents()
  useInitialize()
  useDeepLink()
  usePersonalServer()

  return (
    <div className="flex h-screen">
      {/* Tauri app shell layout: fixed header, scrollable main */}
      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/apps" element={<DataApps />} />
              <Route path="/apps/rickroll" element={<RickRollAppPage />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/grant" element={<GrantFlow />} />
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
        <BrowserProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/browser-login" element={<BrowserLogin />} />
              <Route path="/*" element={<AppRouter />} />
            </Routes>
          </BrowserRouter>
        </BrowserProvider>
      </PrivyProvider>
    </Provider>
  )
}

export default App
