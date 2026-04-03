function installStoragePolyfill(target: "localStorage" | "sessionStorage") {
  const current = globalThis[target] as Storage | undefined
  if (
    current &&
    typeof current.getItem === "function" &&
    typeof current.setItem === "function" &&
    typeof current.removeItem === "function" &&
    typeof current.clear === "function"
  ) {
    return
  }

  const store = new Map<string, string>()
  const polyfill: Storage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }

  Object.defineProperty(globalThis, target, {
    value: polyfill,
    configurable: true,
    writable: true,
  })
}

installStoragePolyfill("localStorage")
installStoragePolyfill("sessionStorage")
