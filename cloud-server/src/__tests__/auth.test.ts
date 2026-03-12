import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// We need to import the module fresh for each test context since auth
// generates a token at module load. For now, test the module as loaded.
import { getAuthToken, validateToken } from "../auth.js";

describe("auth", () => {
  it("getAuthToken returns a non-empty string", () => {
    const token = getAuthToken();
    assert.ok(token.length > 0);
  });

  it("getAuthToken returns the same token on repeated calls", () => {
    assert.equal(getAuthToken(), getAuthToken());
  });

  it("validateToken returns true for valid token", () => {
    assert.ok(validateToken(getAuthToken()));
  });

  it("validateToken returns false for invalid token", () => {
    assert.equal(validateToken("wrong-token"), false);
  });

  it("validateToken returns false for undefined", () => {
    assert.equal(validateToken(undefined), false);
  });
});
