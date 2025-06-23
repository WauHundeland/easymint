'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, Copy, Globe } from 'lucide-react';
import { useState } from 'react';

interface SuccessDisplayProps {
  tokenAddress: string;
  network: WalletAdapterNetwork;
  onCreateAnother: () => void;
}

export function SuccessDisplay({ tokenAddress, network, onCreateAnother }: SuccessDisplayProps) {
  const [copied, setCopied] = useState(false);

  const getExplorerUrl = (address: string) => {
    const baseUrl = network === WalletAdapterNetwork.Mainnet 
      ? 'https://explorer.solana.com' 
      : 'https://explorer.solana.com/?cluster=devnet';
    return `${baseUrl}/address/${address}`;
  };

  const getSolscanUrl = (address: string) => {
    const networkName = network === WalletAdapterNetwork.Mainnet ? 'mainnet' : 'devnet';
    const baseUrl = networkName === 'mainnet' ? 'https://solscan.io' : `https://solscan.io/${networkName}`;
    return `${baseUrl}/token/${address}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <>
      {/* Success Header */}
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
          Token Created Successfully!
        </h3>
        <p className="text-muted-foreground">
          Your SPL token with metadata has been created on Solana {network}
        </p>
      </div>

      {/* Token Details */}
      <div className="p-4 bg-muted rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Token Address:</span>
          <div className="flex items-center gap-2">
            <code className="bg-background px-2 py-1 rounded text-sm max-w-[200px] truncate">
              {tokenAddress}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(tokenAddress)}
            >
              {copied ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={getExplorerUrl(tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Included */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Full Token Features Included:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Token metadata with name, symbol, and description</li>
            <li>• Custom token image (if uploaded)</li>
            <li>• Proper wallet display and recognition</li>
            <li>• Authority settings as configured</li>
            <li>• Professional token presentation</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <Button onClick={onCreateAnother} className="flex-1">
            Create Another Token
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <a
              href={getExplorerUrl(tokenAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Solana Explorer
            </a>
          </Button>
        </div>
        
        <Button variant="outline" asChild className="w-full">
          <a
            href={getSolscanUrl(tokenAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            View on Solscan
          </a>
        </Button>
      </div>

      {/* Save Address Tip */}
      <Alert>
        <AlertDescription>
          💡 <strong>Important:</strong> Save this token address - you'll need it to interact with your token, add it to wallets, or use it in other applications.
        </AlertDescription>
      </Alert>
    </>
  );
} 