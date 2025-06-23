'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { type WalletName } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Wallet, Network, ArrowLeft, Wrench, Globe } from 'lucide-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import Image from 'next/image';

interface WalletConnectionDialogProps {
  children: React.ReactNode;
  onNetworkChange?: (network: WalletAdapterNetwork) => void;
}

type Step = 'network' | 'wallet';

export function WalletConnectionDialog({ children, onNetworkChange }: WalletConnectionDialogProps) {
  const { wallets, select, connecting } = useWallet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('network');

  // Deduplicate wallets by name, keeping the first occurrence
  const deduplicateWallets = (walletList: typeof wallets) => {
    const seen = new Set<string>();
    return walletList.filter((wallet) => {
      if (seen.has(wallet.adapter.name)) {
        return false;
      }
      seen.add(wallet.adapter.name);
      return true;
    });
  };

  const handleNetworkSelect = (network: WalletAdapterNetwork) => {
    if (onNetworkChange) {
      onNetworkChange(network);
    }
    setStep('wallet');
  };

  const handleWalletSelect = async (walletName: WalletName) => {
    select(walletName);
    setOpen(false);
    setStep('network'); // Reset for next time
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog is closed
      setStep('network');
    }
  };

  // Pre-define known wallet logos to avoid 404 requests
  const knownWalletLogos: Record<string, string> = {
    phantom: '/wallets/phantom.svg',
    solflare: '/wallets/solflare.svg', 
    torus: '/wallets/torus.png',
    metamask: "/wallets/metamask.jpg",
  };

  const getWalletIcon = (walletName: string) => {
    const name = walletName.toLowerCase();
    const logoPath = knownWalletLogos[name] ?? '/wallets/default.svg';
    
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <Image
          src={logoPath}
          alt={`${walletName} logo`}
          width={32}
          height={32}
          className="rounded-md"
        />
      </div>
    );
  };

  const networks = [
    { id: WalletAdapterNetwork.Mainnet, name: 'Mainnet', description: 'Use your real SOL and deploy your coin to the world' },
    { id: WalletAdapterNetwork.Devnet, name: 'Devnet', description: 'Test your coin without real money on devnet' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'network' ? (
              <>
                <Network className="h-5 w-5" />
                Select Network
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Select Wallet
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'network'
              ? 'Choose which Solana network you want to connect to.'
              : 'Choose a wallet to connect to your Solana account.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'network' ? (
          <div className="space-y-3">
            {networks.map((network) => (
              <Button
                key={network.id}
                variant="outline"
                className="w-full justify-start h-16"
                onClick={() => handleNetworkSelect(network.id)}
              >
                {network.id === WalletAdapterNetwork.Mainnet ? (
                  <Globe className='size-4 mr-1' />
                ) : (
                  <Wrench className="size-4 mr-1" />
                )}
                <div className="flex flex-col items-start">
                  <span className="font-medium">{network.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {network.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div>
            <Button
              variant="ghost"
              className="mb-3 p-0 h-8"
              onClick={() => setStep('network')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Network Selection
            </Button>

            {/* Installed and Detected Wallets */}
            {deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Installed')).length > 0 && (
              <>
                <div
                  className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2
                   after:z-0 after:flex after:items-center after:border-t after:border-border mb-4">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Installed:
                  </span>
                </div>
                <div className="space-y-3">
                  {deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Installed')).map((wallet, index) => (
                    <Button
                      key={`${wallet.adapter.name}-installed-${index}`}
                      variant="outline"
                      className="w-full justify-start h-12"
                      onClick={() => handleWalletSelect(wallet.adapter.name)}
                      disabled={connecting}
                    >
                      <div className="mr-3">{getWalletIcon(wallet.adapter.name)}</div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{wallet.adapter.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Detected
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* Separator between installed and available */}
            {deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Installed')).length > 0 &&
              deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Loadable' || wallet.readyState === 'NotDetected')).length > 0 && (
                <div
                  className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2
                   after:z-0 after:flex after:items-center after:border-t after:border-border my-4">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Other options:
                  </span>
                </div>
              )}

            {/* Available but Not Installed Wallets */}
            {deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Loadable' || wallet.readyState === 'NotDetected')).length > 0 && (
              <div className="space-y-2">
                {deduplicateWallets(wallets.filter(wallet => wallet.readyState === 'Loadable' || wallet.readyState === 'NotDetected')).map((wallet, index) => (
                  <Button
                    key={`${wallet.adapter.name}-available-${index}`}
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                  >
                    <div className="mr-3">{getWalletIcon(wallet.adapter.name)}</div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{wallet.adapter.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {wallet.readyState === 'Loadable' ? 'Available' : 'Not Installed'}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 