/**
 * ================================================================================
 * DO NOT MODIFY THIS FILE. This file is READ ONLY and is DETERMINISTIC.
 * Exposes only 3 top-level endpoints for robust agent workflows.
 * Handles token decimals robustly for all price/amount calculations.
 * ================================================================================
 */

export type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

export type ListTokensParams = {
  chainId: number;
  limit?: number;
  offset?: number;
};

export type SwapPriceParams = {
  chainId: number;
  buyToken: string;
  sellToken: string;
  sellAmount: number; // Human-readable amount (e.g., 1 for 1 USDT)
  apiKey: string;
};

export type SwapQuoteParams = SwapPriceParams & {
  takerAddress?: string;
};

export type SwapPriceResponse = {
  price: string;
  buyAmount: string;
  sellAmount: string;
  estimatedGas: string;
  buyToken: string;
  sellToken: string;
  error?: string;
};

export type SwapQuoteResponse = {
  to: string;
  data: string;
  value: string;
  gas: string;
  buyToken: string;
  sellToken: string;
  buyAmount: string;
  sellAmount: string;
  error?: string;
};

/**
 * Map of common token addresses to their decimals.
 * Extend this as needed for your supported tokens.
 */
export const TOKEN_DECIMALS: Record<string, number> = {
  // Ethereum mainnet
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 18, // ETH
  '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,  // USDC
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 6,  // USDT
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': 18, // DAI
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 8,  // WBTC
  // Add more tokens as needed
};

/**
 * Get decimals for a token address. Defaults to 18 if unknown.
 */
export function getTokenDecimals(tokenAddress: string): number {
  return TOKEN_DECIMALS[tokenAddress] ?? 18;
}

/**
 * Format a human-readable amount to the correct integer string for the API.
 * E.g., formatSellAmount(1, USDT) => '1000000'
 */
export function formatSellAmount(amount: number, tokenAddress: string): string {
  const decimals = getTokenDecimals(tokenAddress);
  return (amount * Math.pow(10, decimals)).toLocaleString('fullwide', { useGrouping: false });
}

/**
 * Parse a raw token amount string from the API to a human-readable number.
 * E.g., parseTokenAmount('1000000', USDT) => 1
 */
export function parseTokenAmount(rawAmount: string, tokenAddress: string): number {
  const decimals = getTokenDecimals(tokenAddress);
  return Number(rawAmount) / Math.pow(10, decimals);
}

export const formatTokenAmount = (amount: string, decimals: number) => {
  if (!amount || isNaN(Number(amount))) return '0';
  return (Number(amount) / 10 ** decimals).toLocaleString('en-US', { maximumFractionDigits: 6 });
};

export const formatPrice = (price: string) => {
  if (!price || isNaN(Number(price))) return '0';
  return Number(price).toLocaleString('en-US', { maximumFractionDigits: 6 });
};

const BASE_URL = 'https://api.0x.org';

// ========== PRIVATE HELPERS ==========

async function zeroExProxy({
  path,
  method = 'GET',
  query,
  apiKey,
}: {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, any>;
  apiKey: string;
}): Promise<any> {
  const queryString =
    query && Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : '';
  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'api.0x.org',
        path: path + queryString,
        method,
        headers: {
          'Content-Type': 'application/json',
          '0x-api-key': apiKey,
          '0x-version': 'v2',
        },
      }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

function safeToken(raw: any): Token {
  return {
    address: raw?.address || '',
    symbol: raw?.symbol || '',
    name: raw?.name || '',
    decimals: Number(raw?.decimals) || 18,
    logoURI: raw?.logoURI || '',
  };
}

// ========== PUBLIC ENDPOINTS ==========

/** 1. List supported tokens for a chain */
export async function listSupportedTokens(params: ListTokensParams): Promise<Token[]> {
  try {
    const { chainId, limit, offset } = params;
    // 0x does not provide a direct token list endpoint, so this is a static fallback or can be extended
    // For now, return a static list for Ethereum mainnet (chainId=1)
    if (chainId === 1) {
      return [
        { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether', decimals: 6 },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai', decimals: 18 },
        { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
      ].slice(offset || 0, (offset || 0) + (limit || 100));
    }
    // Add more chains as needed
    return [];
  } catch {
    return [];
  }
}

/** 2. Get swap price quote (handles decimals) */
export async function getSwapPrice(params: SwapPriceParams): Promise<SwapPriceResponse> {
  try {
    const { chainId, buyToken, sellToken, sellAmount, apiKey } = params;
    const sellTokenDecimals = getTokenDecimals(sellToken);
    const buyTokenDecimals = getTokenDecimals(buyToken);
    const sellAmountRaw = formatSellAmount(sellAmount, sellToken);
    const query = { chainId, buyToken, sellToken, sellAmount: sellAmountRaw };
    const res = await zeroExProxy({
      path: '/swap/permit2/price',
      method: 'GET',
      query,
      apiKey,
    });
    if (!res || res.error) return { price: '', buyAmount: '', sellAmount: '', estimatedGas: '', buyToken, sellToken, error: res?.error || 'Failed to fetch price' };
    return {
      price: res.price || '',
      buyAmount: res.buyAmount || '',
      sellAmount: res.sellAmount || '',
      estimatedGas: res.estimatedGas || '',
      buyToken: res.buyToken || buyToken,
      sellToken: res.sellToken || sellToken,
    };
  } catch {
    return { price: '', buyAmount: '', sellAmount: '', estimatedGas: '', buyToken: params.buyToken, sellToken: params.sellToken, error: 'Failed to fetch price' };
  }
}

/** 3. Get swap quote (for execution, handles decimals) */
export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResponse> {
  try {
    const { chainId, buyToken, sellToken, sellAmount, apiKey, takerAddress } = params;
    const sellTokenDecimals = getTokenDecimals(sellToken);
    const buyTokenDecimals = getTokenDecimals(buyToken);
    const sellAmountRaw = formatSellAmount(sellAmount, sellToken);
    const query: Record<string, any> = { chainId, buyToken, sellToken, sellAmount: sellAmountRaw };
    if (takerAddress) query.takerAddress = takerAddress;
    const res = await zeroExProxy({
      path: '/swap/permit2/quote',
      method: 'GET',
      query,
      apiKey,
    });
    if (!res || res.error) return { to: '', data: '', value: '', gas: '', buyToken, sellToken, buyAmount: '', sellAmount: '', error: res?.error || 'Failed to fetch quote' };
    return {
      to: res.to || '',
      data: res.data || '',
      value: res.value || '',
      gas: res.gas || '',
      buyToken: res.buyToken || buyToken,
      sellToken: res.sellToken || sellToken,
      buyAmount: res.buyAmount || '',
      sellAmount: res.sellAmount || '',
    };
  } catch {
    return { to: '', data: '', value: '', gas: '', buyToken: params.buyToken, sellToken: params.sellToken, buyAmount: '', sellAmount: '', error: 'Failed to fetch quote' };
  }
}

/**
 * Example usage:
 *
 * // To get the price for 1 USDT to USDC:
 * const price = await getSwapPrice({
 *   chainId: 1,
 *   buyToken: USDC_ADDRESS,
 *   sellToken: USDT_ADDRESS,
 *   sellAmount: 1, // 1 USDT (human-readable)
 *   apiKey: ...
 * });
 * // To display the buy amount in human-readable form:
 * const buyAmount = parseTokenAmount(price.buyAmount, USDC_ADDRESS);
 */