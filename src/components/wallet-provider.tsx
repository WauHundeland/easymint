'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface WalletContextProviderProps {
  children: React.ReactNode;
}

interface NetworkContextType {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const savedNetwork = localStorage.getItem('solana-network');
        if (savedNetwork && Object.values(WalletAdapterNetwork).includes(savedNetwork as WalletAdapterNetwork)) {
          return savedNetwork as WalletAdapterNetwork;
        }
      } catch (error) {
        console.warn('Failed to load network from localStorage:', error);
      }
    }
    return WalletAdapterNetwork.Mainnet;
  });

  // Persist network changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('solana-network', network);
      } catch (error) {
        console.warn('Failed to save network to localStorage:', error);
      }
    }
  }, [network]);

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

function WalletConnectionProvider({ children }: { children: ReactNode }) {
  const { network } = useNetwork();

  // Custom RPC endpoints with fallback
  const endpoint = useMemo(() => {
    // You can replace this with your own RPC endpoint
    // For production, consider using paid RPC providers like:
    // - Helius: https://helius.xyz
    // - QuickNode: https://quicknode.com
    // - Alchemy: https://alchemy.com
    
    const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    
    if (HELIUS_API_KEY && network === WalletAdapterNetwork.Mainnet) {
      return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    }
    
    // Alternative free RPC endpoints (use with caution for production)
    switch (network) {
      case WalletAdapterNetwork.Mainnet:
        // Free alternatives (rate limited):
        // return 'https://rpc.ankr.com/solana'; // Ankr (500 req/day)
        // return 'https://api.mainnet-beta.solana.com'; // Official (often rate limited)
        return 'https://rpc.ankr.com/solana'; // Using Ankr as fallback
      case WalletAdapterNetwork.Devnet:
        return clusterApiUrl(network);
      case WalletAdapterNetwork.Testnet:
        return clusterApiUrl(network);
      default:
        return clusterApiUrl(network);
    }
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          console.warn('Wallet error:', error);
        }}
        localStorageKey="easymint-wallet"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  return (
    <NetworkProvider>
      <WalletConnectionProvider>
        {children}
      </WalletConnectionProvider>
    </NetworkProvider>
  );
}