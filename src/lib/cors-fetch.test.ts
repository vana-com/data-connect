import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri HTTP plugin (same pattern as personalServer.test.ts)
const tauriFetchSpy = vi.fn();
vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => tauriFetchSpy(...args),
}));

import { corsFetch } from "./cors-fetch";

const globalFetchSpy = vi.fn();
vi.stubGlobal("fetch", globalFetchSpy);

beforeEach(() => {
  tauriFetchSpy.mockReset();
  globalFetchSpy.mockReset();
});

afterEach(() => {
  // Clean up Tauri markers between tests
  delete (window as Record<string, unknown>).__TAURI__;
  delete (window as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("corsFetch — browser runtime (no __TAURI__)", () => {
  it("delegates to global fetch", async () => {
    const fakeResponse = new Response("ok");
    globalFetchSpy.mockResolvedValueOnce(fakeResponse);

    const result = await corsFetch("https://example.com");

    expect(globalFetchSpy).toHaveBeenCalledWith("https://example.com", undefined);
    expect(tauriFetchSpy).not.toHaveBeenCalled();
    expect(result).toBe(fakeResponse);
  });

  it("passes init options through to global fetch", async () => {
    globalFetchSpy.mockResolvedValueOnce(new Response());

    const init: RequestInit = { method: "POST", body: "data" };
    await corsFetch("https://example.com/api", init);

    expect(globalFetchSpy).toHaveBeenCalledWith("https://example.com/api", init);
  });
});

describe("corsFetch — Tauri runtime (__TAURI__ present)", () => {
  it("delegates to Tauri HTTP plugin fetch when __TAURI__ is present", async () => {
    (window as Record<string, unknown>).__TAURI__ = {};
    const fakeResponse = new Response("tauri-ok");
    tauriFetchSpy.mockResolvedValueOnce(fakeResponse);

    const result = await corsFetch("https://builder.example.com/manifest.json");

    expect(tauriFetchSpy).toHaveBeenCalledWith(
      "https://builder.example.com/manifest.json",
      undefined,
    );
    expect(globalFetchSpy).not.toHaveBeenCalled();
    expect(result).toBe(fakeResponse);
  });

  it("delegates to Tauri HTTP plugin fetch when __TAURI_INTERNALS__ is present", async () => {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const fakeResponse = new Response("tauri-ok");
    tauriFetchSpy.mockResolvedValueOnce(fakeResponse);

    const result = await corsFetch("https://builder.example.com");

    expect(tauriFetchSpy).toHaveBeenCalledWith(
      "https://builder.example.com",
      undefined,
    );
    expect(globalFetchSpy).not.toHaveBeenCalled();
    expect(result).toBe(fakeResponse);
  });

  it("passes init options through to Tauri fetch", async () => {
    (window as Record<string, unknown>).__TAURI__ = {};
    tauriFetchSpy.mockResolvedValueOnce(new Response());

    const init: RequestInit = { method: "PUT", headers: { "X-Custom": "1" } };
    await corsFetch("https://builder.example.com/api", init);

    expect(tauriFetchSpy).toHaveBeenCalledWith(
      "https://builder.example.com/api",
      init,
    );
  });
});
