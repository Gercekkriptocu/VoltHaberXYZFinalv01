/**
 * NFT Metadata Storage
 * 
 * In-memory storage for NFT metadata.
 * For production, replace with a database (Vercel KV, PostgreSQL, MongoDB, etc.)
 */

export interface NFTMetadata {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  timestamp: number;
  minterAddress?: string;
  newsId?: string;
}

// In-memory storage (will be lost on server restart)
const metadataStore = new Map<string, NFTMetadata>();

/**
 * Save metadata for a token ID
 */
export function saveMetadata(metadata: NFTMetadata): void {
  metadataStore.set(metadata.tokenId, metadata);
  console.log(`💾 Metadata saved for token ${metadata.tokenId}`);
}

/**
 * Get metadata for a token ID
 */
export function getMetadata(tokenId: string): NFTMetadata | null {
  return metadataStore.get(tokenId) || null;
}

/**
 * Check if metadata exists for a token ID
 */
export function hasMetadata(tokenId: string): boolean {
  return metadataStore.has(tokenId);
}

/**
 * Get all stored metadata (for debugging)
 */
export function getAllMetadata(): NFTMetadata[] {
  return Array.from(metadataStore.values());
}

/**
 * Create OpenSea-compatible metadata
 */
export function createNFTMetadata(
  tokenId: string,
  newsTitle: string,
  newsContent: string,
  newsDate: string,
  newsUrl?: string,
  language: 'tr' | 'en' = 'tr',
  minterAddress?: string,
  newsId?: string
): NFTMetadata {
  const shortDescription = newsContent.length > 200 
    ? newsContent.substring(0, 200) + '...' 
    : newsContent;

  // Traits are always in English
  return {
    tokenId,
    name: 'Volt News',
    description: shortDescription,
    image: 'https://chocolate-fascinating-hare-258.mypinata.cloud/ipfs/bafybeigwiu7fzvzi7zzdkive7fbdjnsrb66smkflsubq4fitu46cxbbvrm', // IPFS Volt News image
    external_url: newsUrl,
    attributes: [
      {
        trait_type: 'Date',
        value: newsDate
      },
      {
        trait_type: 'Source',
        value: 'Volt News'
      },
      {
        trait_type: 'Mint Time',
        value: new Date().toISOString()
      }
    ],
    timestamp: Date.now(),
    minterAddress,
    newsId
  };
}

/**
 * Get metadata by minter address
 */
export function getMetadataByMinter(minterAddress: string): NFTMetadata[] {
  return Array.from(metadataStore.values()).filter(
    (metadata) => metadata.minterAddress?.toLowerCase() === minterAddress.toLowerCase()
  );
}
