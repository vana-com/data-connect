import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Provider } from "react-redux"
import { store } from "@/state/store"
import { SettingsServerModeSection } from "./settings-server-mode"

function renderServerMode() {
  return render(
    <Provider store={store}>
      <SettingsServerModeSection />
    </Provider>
  )
}

function resetServerMode() {
  store.dispatch({
    type: "app/setAppConfig",
    payload: { serverMode: "local-only", remoteServerUrl: undefined },
  })
}

describe("SettingsServerModeSection", () => {
  afterEach(() => {
    cleanup()
    resetServerMode()
  })

  it("shows honest local-only copy: no bundled Personal Server claim", () => {
    resetServerMode()
    renderServerMode()

    const localOnlyRadio = screen.getByRole("radio", { name: /Local only/ })
    expect(localOnlyRadio.getAttribute("aria-checked")).toBe("true")

    // The old two-state copy falsely claimed a bundled Personal Server is
    // ingesting data whenever serverMode !== 'remote', including when it was
    // actually 'local-only'. That claim must be scoped to the "Bundled
    // local server" option only, not asserted as the active-mode summary.
    expect(
      localOnlyRadio.textContent?.includes("bundled with this app")
    ).toBe(false)

    expect(
      screen.getByText(
        /Exports are written to local disk only\. No Personal Server is running/
      )
    ).toBeTruthy()
  })

  it("is reachable from every other mode: local-only is not a one-way trap", () => {
    resetServerMode()
    renderServerMode()

    // Move to the bundled local server.
    fireEvent.click(screen.getByRole("radio", { name: /Bundled local server/ }))
    expect(store.getState().app.appConfig.serverMode).toBe("local")

    // From bundled-local, local-only must still be selectable.
    fireEvent.click(screen.getByRole("radio", { name: /Local only/ }))
    expect(store.getState().app.appConfig.serverMode).toBe("local-only")

    // Move to remote.
    fireEvent.click(screen.getByRole("radio", { name: /Remote \(Vana\)/ }))
    expect(store.getState().app.appConfig.serverMode).toBe("remote")

    // From remote, local-only must still be reachable (previously this
    // screen could only reach 'local' or 'remote' and never local-only
    // again once left).
    fireEvent.click(screen.getByRole("radio", { name: /Local only/ }))
    expect(store.getState().app.appConfig.serverMode).toBe("local-only")
  })

  it("only shows the Connect with Vana card in remote mode", () => {
    resetServerMode()
    renderServerMode()

    expect(
      screen.queryByText(
        "Open your browser to authorize this device. Your Personal Server URL will be auto-discovered."
      )
    ).toBeNull()

    fireEvent.click(screen.getByRole("radio", { name: /Remote \(Vana\)/ }))

    expect(
      screen.getByText(
        "Open your browser to authorize this device. Your Personal Server URL will be auto-discovered."
      )
    ).toBeTruthy()
  })
})
