'use client';

import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { NFT_CONTRACT_CONFIG, switchToBaseMainnet, generateTokenId, isOnBaseMainnet } from '@/lib/web3-config';

interface MintResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface NewsMetadata {
  title: string;
  content: string;
  date: string;
}

interface UseNFTMintReturn {
  isMinting: boolean;
  isConnecting: boolean;
  account: string | null;
  connectWallet: () => Promise<void>;
  mintNFT: (newsId: string, metadata: NewsMetadata, language?: 'tr' | 'en') => Promise<MintResult>;
  checkIfMinted: (newsId: string) => Promise<boolean>;
  showWalletNotification: (message: string) => void;
}

// Global notification callback
let walletNotificationCallback: ((message: string) => void) | null = null;

export function setWalletNotificationCallback(callback: (message: string) => void): void {
  walletNotificationCallback = callback;
}

export function useNFTMint(): UseNFTMintReturn {
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [account, setAccount] = useState<string | null>(null);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('EVM cüzdan bulunamadı. Lütfen MetaMask, OKX Wallet veya başka bir cüzdan yükleyin.');
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts.length === 0) {
        throw new Error('Cüzdan bağlanamadı');
      }

      setAccount(accounts[0] || null);

      // Trigger wallet notification
      if (walletNotificationCallback) {
        walletNotificationCallback('EVM Cüzdanı Bağlandı! 🎉');
      }

      // Check if on Base Mainnet, if not switch
      const onBase = await isOnBaseMainnet();
      if (!onBase) {
        const switched = await switchToBaseMainnet();
        if (!switched) {
          throw new Error('Base Mainnet\'e geçiş yapılamadı');
        }
      }

      // Listen for account changes
      if (window.ethereum.on) {
        window.ethereum.on('accountsChanged', (newAccounts: unknown) => {
          const accounts = newAccounts as string[];
          setAccount(accounts[0] || null);
        });

        window.ethereum.on('chainChanged', () => {
          // Network changed - no need to reload, just notify
          console.log('Network changed');
        });
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Check if NFT already minted - Always return false to allow multiple mints
  // Public mint() contract allows unlimited minting
  const checkIfMinted = useCallback(async (newsId: string): Promise<boolean> => {
    // Always return false - users can mint as many times as they want
    return false;
  }, [account]);

  // Mint NFT
  const mintNFT = useCallback(async (newsId: string, metadata: NewsMetadata, language: 'tr' | 'en' = 'tr'): Promise<MintResult> => {
    setIsMinting(true);

    try {
      // Check network
      const onBase = await isOnBaseMainnet();
      if (!onBase) {
        const switched = await switchToBaseMainnet();
        if (!switched) {
          throw new Error('Lütfen Base Mainnet ağına geçin');
        }
      }

      // Create provider and signer
      const provider = new BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      
      // Get the actual address from signer (not from state)
      const signerAddress = await signer.getAddress();

      // Verify account has enough ETH for mint + gas
      const balance = await provider.getBalance(signerAddress);
      const mintCost = parseEther(NFT_CONTRACT_CONFIG.mintPrice);
      const estimatedGas = parseEther('0.001'); // Estimate for gas
      
      if (balance < (mintCost + estimatedGas)) {
        throw new Error(`Yetersiz bakiye. Mint için en az ${NFT_CONTRACT_CONFIG.mintPrice} ETH + gas ücreti gerekli`);
      }

      // Create contract instance
      const contract = new Contract(
        NFT_CONTRACT_CONFIG.address,
        NFT_CONTRACT_CONFIG.abi,
        signer
      );

      // Verify contract exists by checking code at address
      const code = await provider.getCode(NFT_CONTRACT_CONFIG.address);
      if (code === '0x') {
        throw new Error('⚠️ Kontrat Base Mainnet üzerinde bulunamadı!\n\nKontrat adresi: ' + NFT_CONTRACT_CONFIG.address + '\nAğ: Base Mainnet (8453)\n\nLütfen kontrat deploy edilmiş mi kontrol edin.');
      }

      console.log('✅ Contract verified on Base Mainnet');
      console.log('📝 Contract address:', NFT_CONTRACT_CONFIG.address);
      
      // Generate unique newsCardId from newsId
      const newsCardId = generateTokenId(newsId);
      console.log('🆔 Generated newsCardId:', newsCardId);
      
      // Create metadata URI pointing to our API endpoint
      const metadataURI = `${window.location.origin}/api/metadata/${newsCardId}`;
      console.log('📝 Metadata URI:', metadataURI);
      
      // Try to estimate gas (optional - won't block minting if it fails)
      try {
        const gasEstimate = await contract.mintNFT.estimateGas(newsCardId, metadataURI, {
          value: mintCost,
          from: signerAddress
        });
        console.log('⛽ Gas estimate:', gasEstimate.toString());
      } catch (estimateError: unknown) {
        console.warn('⚠️ Gas estimation failed, but will try minting anyway:', estimateError);
        // Don't throw - continue with actual mint
      }

      console.log('🎨 Attempting mint with:', {
        account,
        newsCardId,
        metadataURI,
        mintPrice: NFT_CONTRACT_CONFIG.mintPrice,
        value: mintCost.toString(),
        contract: NFT_CONTRACT_CONFIG.address
      });

      // Save metadata BEFORE minting
      try {
        const metadataResponse = await fetch('/api/metadata/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId: newsCardId,
            title: metadata.title,
            content: metadata.content,
            date: metadata.date,
            newsId: newsId,
            language: language,
            minterAddress: signerAddress
          })
        });

        if (!metadataResponse.ok) {
          console.warn('⚠️ Metadata save failed, but continuing with mint');
        } else {
          console.log('✅ Metadata saved successfully');
        }
      } catch (metadataError) {
        console.warn('⚠️ Metadata save error:', metadataError);
        // Continue with mint even if metadata save fails
      }

      // Call mintNFT(uint256 newsCardId, string uri) function
      const tx = await contract.mintNFT(newsCardId, metadataURI, {
        value: mintCost
        // Let wallet/ethers calculate gas automatically for better compatibility
      });

      console.log('Transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        txHash: receipt?.hash || tx.hash
      };
    } catch (error: unknown) {
      console.error('Mint error:', error);
      
      let errorMessage = 'Mint işlemi başarısız';
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          errorMessage = 'İşlem iptal edildi';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Yetersiz bakiye';
        } else if (error.message.includes('already minted')) {
          errorMessage = 'Bu haber zaten mint edilmiş';
        } else if (error.message.includes('bulunamadı')) {
          errorMessage = error.message;
        } else if (error.message.includes('CALL_EXCEPTION') || error.message.includes('missing revert data')) {
          errorMessage = 'Kontrat çağrısı başarısız. Kontrat adresi veya fonksiyon hatalı olabilir.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsMinting(false);
    }
  }, [account, checkIfMinted]);

  const showWalletNotification = useCallback((message: string): void => {
    if (walletNotificationCallback) {
      walletNotificationCallback(message);
    }
  }, []);

  return {
    isMinting,
    isConnecting,
    account,
    connectWallet,
    mintNFT,
    checkIfMinted,
    showWalletNotification
  };
}
