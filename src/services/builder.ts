// Builder verification service
// Verifies builder identity via Gateway lookup + manifest fetch + EIP-191 signature check.

import { verifyMessage } from "viem/utils";
import type { BuilderManifest } from "@/pages/grant/types";
import { corsFetch } from "@/lib/cors-fetch";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://data-gateway-env-dev-opendatalabs.vercel.app";

// --- Types ---

interface GatewayBuilderResponse {
  id: string;
  appUrl: string;
  publicKey: string;
}

/** All Gateway responses wrap payload in { data, proof } (protocol spec §4.2.5). */
interface GatewayEnvelope<T> {
  data: T;
  proof?: unknown;
}

interface VanaManifestBlock {
  appUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  supportUrl?: string;
  webhookUrl?: string;
  signature?: string;
}

/** Required fields in the vana block per protocol spec section 5.5. */
const REQUIRED_VANA_FIELDS: (keyof VanaManifestBlock)[] = [
  "appUrl",
  "signature",
];

interface W3CManifest {
  name?: string;
  short_name?: string;
  description?: string;
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
    response = await corsFetch(url);
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

  const envelope = (await response.json()) as GatewayEnvelope<GatewayBuilderResponse>;
  const builder = envelope.data;
  console.warn("[builder-verify] Gateway builder:", JSON.stringify(builder));
  return builder;
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
  console.warn("[builder-verify] fetchManifest called with appUrl:", JSON.stringify(appUrl));
  // Phase 1: Try the conventional W3C manifest location directly.
  try {
    const directUrl = resolveUrl(appUrl, "/manifest.json");
    const directResponse = await corsFetch(directUrl);
    if (directResponse.ok) {
      const manifest = (await directResponse.json()) as W3CManifest;
      return { manifest, manifestUrl: directUrl };
    }
  } catch {
    // Direct fetch failed — fall through to HTML scraping
  }

  // Phase 2: Fall back to HTML-based manifest discovery.
  let htmlResponse: Response;
  try {
    htmlResponse = await corsFetch(appUrl);
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
    manifestResponse = await corsFetch(manifestUrl);
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
  granteeAddress: string,
  sessionWebhookUrl?: string
): Promise<BuilderManifest> {
  // 1. Look up builder on Gateway
  const builder = await fetchGatewayBuilder(granteeAddress);
  console.warn("[builder-verify] appUrl from Gateway:", JSON.stringify(builder.appUrl));

  if (!builder.appUrl) {
    throw new BuilderVerificationError(
      "Builder registration incomplete: no appUrl returned by Gateway"
    );
  }

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

  // 3. Validate required vana fields per protocol spec
  for (const field of REQUIRED_VANA_FIELDS) {
    if (!vana[field]) {
      throw new BuilderVerificationError(
        `Manifest vana block is missing required '${field}' field`
      );
    }
  }

  // 4. Verify vana.appUrl equals the on-chain appUrl (protocol spec section 5.5 step 2)
  if (vana.appUrl !== builder.appUrl) {
    throw new BuilderVerificationError(
      `Manifest vana.appUrl (${vana.appUrl}) does not match on-chain appUrl (${builder.appUrl})`
    );
  }

  // 5. Verify webhookUrl matches if session provided one (protocol spec section 5.5 step 4)
  if (sessionWebhookUrl && vana.webhookUrl !== sessionWebhookUrl) {
    throw new BuilderVerificationError(
      `Session webhookUrl (${sessionWebhookUrl}) does not match manifest vana.webhookUrl (${vana.webhookUrl ?? "absent"})`
    );
  }

  // 6. Verify EIP-191 signature of the vana block
  // The signature proves the manifest was published by the builder address.
  // Canonical message: JSON of the vana block with keys sorted alphabetically,
  // excluding the "signature" field itself.
  const canonicalPayload = Object.keys(vana)
    .filter((k) => k !== "signature")
    .sort()
    .reduce<Record<string, unknown>>((obj, k) => {
      obj[k] = vana[k as keyof VanaManifestBlock];
      return obj;
    }, {});
  const canonicalMessage = JSON.stringify(canonicalPayload);

  const isValid = await verifyMessage({
    address: granteeAddress as `0x${string}`,
    message: canonicalMessage,
    signature: vana.signature as `0x${string}`,
  });

  if (!isValid) {
    throw new BuilderVerificationError(
      "Manifest vana block signature is invalid — signer does not match builder address"
    );
  }

  // 7. Build result from manifest + vana block
  const icons = (manifest.icons ?? []).map((icon) => ({
    src: resolveUrl(builder.appUrl, icon.src),
    sizes: icon.sizes,
    type: icon.type,
  }));

  return {
    name: manifest.name || manifest.short_name || granteeAddress,
    description: manifest.description,
    icons: icons.length > 0 ? icons : undefined,
    appUrl: vana.appUrl!,
    privacyPolicyUrl: vana.privacyPolicyUrl,
    termsUrl: vana.termsUrl,
    supportUrl: vana.supportUrl,
    verified: true,
  };
}
