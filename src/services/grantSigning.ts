interface GrantData {
  sessionId: string;
  appId: string;
  scopes: string[];
  expiresAt: string;
  walletAddress: string;
}

interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

interface EIP712TypedData {
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    Grant: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  domain: EIP712Domain;
  message: GrantData;
}

const EIP712_DOMAIN: EIP712Domain = {
  name: 'VanaDataPortability',
  version: '1',
  chainId: 1,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const EIP712_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Grant: [
    { name: 'sessionId', type: 'string' },
    { name: 'appId', type: 'string' },
    { name: 'scopes', type: 'string[]' },
    { name: 'expiresAt', type: 'string' },
    { name: 'walletAddress', type: 'address' },
  ],
};

export class SigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigningError';
  }
}

export function prepareGrantMessage(grantData: GrantData): EIP712TypedData {
  return {
    types: EIP712_TYPES,
    primaryType: 'Grant',
    domain: EIP712_DOMAIN,
    message: grantData,
  };
}

export function verifyGrantSignature(_typedData: EIP712TypedData, signature: string): boolean {
  // Basic validation - in production, this would verify the signature against the message
  // using ethers.js or similar library
  try {
    return !!signature && signature.length === 132;
  } catch {
    return false;
  }
}
