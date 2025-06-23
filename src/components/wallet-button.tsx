'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, RefreshCw, Network, Globe } from 'lucide-react';
import { WalletConnectionDialog } from '@/components/wallet-connection-dialog';
import { useNetwork } from '@/components/wallet-provider';

export function WalletButton() {
  const { connection } = useConnection();
  const { publicKey, disconnect, connecting, connected, wallet } = useWallet();
  const { network: selectedNetwork, setNetwork } = useNetwork();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = async () => {
    if (!publicKey) return;

    setLoadingBalance(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      void fetchBalance();
    } else {
      setBalance(null);
    }
  }, [publicKey, connection]);

  const handleNetworkChange = (newNetwork: WalletAdapterNetwork) => {
    setNetwork(newNetwork);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const copyAddress = () => {
    if (publicKey) {
      void navigator.clipboard.writeText(publicKey.toString());
    }
  };

  const openExplorer = () => {
    if (publicKey) {
      const cluster = getNetworkName(selectedNetwork).toLowerCase() === 'mainnet' ? '' : `?cluster=${getNetworkName(selectedNetwork).toLowerCase()}`;
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}${cluster}`, '_blank');
    }
  };

  const openSolscan = () => {
    if (publicKey) {
      const network = getNetworkName(selectedNetwork).toLowerCase();
      const baseUrl = network === 'mainnet' ? 'https://solscan.io' : `https://solscan.io/${network}`;
      window.open(`${baseUrl}/account/${publicKey.toString()}`, '_blank');
    }
  };

  const getNetworkName = (network: WalletAdapterNetwork) => {
    switch (network) {
      case WalletAdapterNetwork.Mainnet:
        return 'Mainnet';
      case WalletAdapterNetwork.Testnet:
        return 'Testnet';
      case WalletAdapterNetwork.Devnet:
        return 'Devnet';
      default:
        return 'Unknown';
    }
  };

  const networkName = getNetworkName(selectedNetwork);

  if (connecting) {
    return (
      <div className="flex items-center gap-3">
        <Button disabled className="min-w-[140px]">
          <Wallet className="mr-2 h-4 w-4" />
          Connecting...
        </Button>
      </div>
    );
  }

  if (!connected || !publicKey) {
    return (
      <div className="flex items-center gap-3">
        <WalletConnectionDialog onNetworkChange={handleNetworkChange}>
          <Button className="min-w-[140px]">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </WalletConnectionDialog>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Wallet Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between">
            <div className="flex items-center">
              <div className={`w-2 h-2 ${balance === null ? 'bg-red-500' :
                  selectedNetwork === WalletAdapterNetwork.Mainnet ? 'bg-green-500' : 'bg-yellow-500'
                } rounded-full mr-2 ${loadingBalance ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col items-start">
                <span className="font-mono text-xs">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {loadingBalance ? 'Loading...' : balance !== null ? `${balance.toFixed(4)} SOL` : 'Failed to connect'}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel className="font-mono text-xs">
            <div className="font-medium mb-1">Wallet Details</div>
            <div className="break-all text-muted-foreground mb-2">
              {publicKey.toString()}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network:</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{networkName}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet:</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{wallet?.adapter?.name ?? 'Unknown'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-semibold">
                  {loadingBalance ? 'Loading...' : balance !== null ? `${balance.toFixed(4)} SOL` : 'Unknown'}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void fetchBalance()} disabled={loadingBalance}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
            Refresh Balance
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSolscan}>
            <Globe className="mr-2 h-4 w-4" />
            View on Solscan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {selectedNetwork === WalletAdapterNetwork.Mainnet ? (
            <DropdownMenuItem onClick={() => handleNetworkChange(WalletAdapterNetwork.Devnet)}>
              <Network className="mr-2 h-4 w-4" />
              Switch to Devnet
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleNetworkChange(WalletAdapterNetwork.Mainnet)}>
              <Network className="mr-2 h-4 w-4" />
              Switch to Mainnet
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-red-400 focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4 text-red-400" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 