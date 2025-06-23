'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, AlertTriangle, Copy, Info } from 'lucide-react';
import { useState } from 'react';

interface UltraCheapSuccessDisplayProps {
  tokenAddress: string;
  network: WalletAdapterNetwork;
  onCreateAnother: () => void;
}

export function UltraCheapSuccessDisplay({
  tokenAddress,
  network,
  onCreateAnother,
}: UltraCheapSuccessDisplayProps) {
  const [copied, setCopied] = useState(false);

  const getExplorerUrl = (address: string) => {
    if (network === WalletAdapterNetwork.Mainnet) {
      return `https://explorer.solana.com/address/${address}`;
    } else {
      return `https://explorer.solana.com/address/${address}?cluster=devnet`;
    }
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

  const handleExplorerClick = () => {
    const url = getExplorerUrl(tokenAddress);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Success Header */}
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
          Ultra Cheap Token Created Successfully!
        </h3>
        <p className="text-muted-foreground">
          Your minimal-cost SPL token has been created on Solana {network}
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
              onClick={handleExplorerClick}
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
          </div>
        </div>
      </div>

      {/* Why Token Name Doesn't Show in Wallet */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Why doesn't my token show a name in my wallet?</strong>
          <p className="mt-2 text-sm">
            Ultra-cheap tokens are created without metadata to save costs. This means:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Wallets will show "Unknown Token" or just the mint address</li>
            <li>• No token name, symbol, or image will be displayed</li>
            <li>• The token still functions normally for transfers and trading</li>
            <li>• You can add metadata later using the regular token creator if needed</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Important Notice */}
      <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> This token was created without metadata to minimize costs. 
          While it functions as a normal SPL token, it will appear as "Unknown Token" in most wallets and DEXs. 
          You can upgrade it later by creating metadata separately if needed.
        </AlertDescription>
      </Alert>

      {/* Cost Savings Summary */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Cost Savings Achieved:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Saved ~0.01 SOL by skipping metadata creation</li>
            <li>• Saved 0.01 SOL by removing Metaplex protocol fees</li>
            <li>• Saved storage costs by not uploading images</li>
            <li>• Total savings: ~85-90% compared to full token creation</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={onCreateAnother} className="flex-1">
          Create Another Ultra Cheap Token
        </Button>
        <Button variant="outline" onClick={handleExplorerClick} className="flex-1">
          <ExternalLink className="h-4 w-4" />
          View on Explorer
        </Button>
      </div>
    </>
  );
} 