/**
 * Web3 Configuration for Base Mainnet NFT Minting
 */

// Base Mainnet Configuration
export const BASE_MAINNET_CONFIG = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
} as const;

// NFT Contract Configuration
export const NFT_CONTRACT_CONFIG = {
  address: '0x593D0dec257a7EF27a4BDA0d3c42742Eee050c2B',
  mintPrice: '0.00005', // ETH
  chainId: 8453, // Base Mainnet
  
  // ERC-721 ABI for mintNFT function
  abi: [
    {
      inputs: [
        { internalType: 'uint256', name: 'newsCardId', type: 'uint256' },
        { internalType: 'string', name: 'uri', type: 'string' }
      ],
      name: 'mintNFT',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'totalSupply',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    }
  ]
} as const;

// Helper: Check if user is on Base Mainnet
export async function isOnBaseMainnet(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === BASE_MAINNET_CONFIG.chainId;
  } catch (error) {
    console.error('Error checking chain ID:', error);
    return false;
  }
}

// Helper: Switch to Base Mainnet
export async function switchToBaseMainnet(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('MetaMask not installed');
    return false;
  }

  try {
    // Try switching first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_MAINNET_CONFIG.chainId }]
    });
    return true;
  } catch (switchError: unknown) {
    // If chain not added, add it
    const error = switchError as { code?: number };
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BASE_MAINNET_CONFIG]
        });
        return true;
      } catch (addError) {
        console.error('Error adding Base Mainnet:', addError);
        return false;
      }
    }
    console.error('Error switching to Base Mainnet:', switchError);
    return false;
  }
}

// Helper: Generate unique token ID from news ID
export function generateTokenId(newsId: string): string {
  // Create a numeric hash from the news ID
  let hash = 0;
  for (let i = 0; i < newsId.length; i++) {
    const char = newsId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Make it positive and within safe range
  return Math.abs(hash).toString();
}

// TypeScript declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
