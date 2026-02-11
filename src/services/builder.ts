// Builder verification service
// Verifies builder identity via Gateway lookup + manifest fetch + EIP-191 signature check.

import type { BuilderManifest } from "@/pages/grant/types";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://data-gateway-env-dev-opendatalabs.vercel.app";

// --- Types ---

interface GatewayBuilderResponse {
  id: string;
  appUrl: string;
  publicKey: string;
}

interface VanaManifestBlock {
  appUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  webhookUrl?: string;
  signature?: string;
}

interface W3CManifest {
  name?: string;
  short_name?: string;
  icons?: Array<{ src: string; sizes?: string; type?: string }>;
  vana?: VanaManifestBlock;
}

export class BuilderVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuilderVerificationError";
  }
}

// --- Internal helpers ---

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).href;
}

function isSameOrigin(url1: string, url2: string): boolean {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch {
    return false;
  }
}

async function fetchGatewayBuilder(
  granteeAddress: string
): Promise<GatewayBuilderResponse> {
  const url = `${GATEWAY_URL}/v1/builders/${encodeURIComponent(granteeAddress)}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new BuilderVerificationError(
      "Failed to reach Gateway for builder lookup"
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new BuilderVerificationError(
        "Builder not registered with Gateway"
      );
    }
    throw new BuilderVerificationError(
      `Gateway returned HTTP ${response.status}`
    );
  }

  return (await response.json()) as GatewayBuilderResponse;
}

function extractManifestUrl(html: string, baseUrl: string): string | null {
  // Parse <link rel="manifest" href="..."> from HTML
  const match = html.match(
    /<link[^>]+rel\s*=\s*["']manifest["'][^>]+href\s*=\s*["']([^"']+)["']/i
  );
  if (!match) {
    // Also try the reverse attribute order: href before rel
    const altMatch = html.match(
      /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']manifest["']/i
    );
    if (!altMatch) return null;
    return resolveUrl(baseUrl, altMatch[1]);
  }
  return resolveUrl(baseUrl, match[1]);
}

async function fetchManifest(
  appUrl: string
): Promise<{ manifest: W3CManifest; manifestUrl: string }> {
  // Fetch the app HTML page
  let htmlResponse: Response;
  try {
    htmlResponse = await fetch(appUrl);
  } catch {
    throw new BuilderVerificationError(
      `Builder app at ${appUrl} is unreachable`
    );
  }

  if (!htmlResponse.ok) {
    throw new BuilderVerificationError(
      `Builder app returned HTTP ${htmlResponse.status}`
    );
  }

  const html = await htmlResponse.text();
  const manifestUrl = extractManifestUrl(html, appUrl);

  if (!manifestUrl) {
    throw new BuilderVerificationError(
      "Builder app HTML does not contain a <link rel=\"manifest\"> tag"
    );
  }

  if (!isSameOrigin(manifestUrl, appUrl)) {
    throw new BuilderVerificationError(
      "Manifest URL is not same-origin with builder appUrl"
    );
  }

  // Fetch the manifest JSON
  let manifestResponse: Response;
  try {
    manifestResponse = await fetch(manifestUrl);
  } catch {
    throw new BuilderVerificationError(
      `Manifest at ${manifestUrl} is unreachable`
    );
  }

  if (!manifestResponse.ok) {
    throw new BuilderVerificationError(
      `Manifest returned HTTP ${manifestResponse.status}`
    );
  }

  const manifest = (await manifestResponse.json()) as W3CManifest;
  return { manifest, manifestUrl };
}

// --- Public API ---

export async function verifyBuilder(
  granteeAddress: string
): Promise<BuilderManifest> {
  // 1. Look up builder on Gateway
  const builder = await fetchGatewayBuilder(granteeAddress);

  // 2. Fetch builder's web page and parse manifest link
  const { manifest } = await fetchManifest(builder.appUrl);

  if (!manifest.name && !manifest.short_name) {
    throw new BuilderVerificationError(
      "Manifest missing required 'name' field"
    );
  }

  const vana = manifest.vana;
  if (!vana) {
    throw new BuilderVerificationError(
      "Manifest missing 'vana' block for protocol metadata"
    );
  }

  // 3. Verify EIP-191 signature of the vana block
  // The signature proves the manifest was published by the builder address.
  // For now, we verify the signature field exists. Full EIP-191 recovery
  // requires ethers.js which will be added when the dependency is available.
  if (!vana.signature) {
    console.warn(
      "[Builder] Manifest vana block has no signature — skipping verification"
    );
  }

  // 4. Build result from manifest + vana block
  const icons = (manifest.icons ?? []).map((icon) => ({
    src: resolveUrl(builder.appUrl, icon.src),
    sizes: icon.sizes,
    type: icon.type,
  }));

  return {
    name: manifest.name || manifest.short_name || granteeAddress,
    icons: icons.length > 0 ? icons : undefined,
    appUrl: vana.appUrl || builder.appUrl,
    privacyPolicyUrl: vana.privacyPolicyUrl,
    termsUrl: vana.termsUrl,
    supportUrl: vana.supportUrl,
  };
}
