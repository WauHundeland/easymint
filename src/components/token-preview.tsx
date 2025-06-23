'use client';

import { useState } from 'react';
import type { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  supply: number;
  decimals: number;
}

interface TokenPreviewProps {
  tokenAddress?: string;
  metadata: TokenMetadata;
  network: WalletAdapterNetwork;
  onClose?: () => void;
  isLivePreview?: boolean;
}

export function TokenPreview({ metadata }: TokenPreviewProps) {
  const [imageError, setImageError] = useState(false);

  const formatSupply = (_supply: number, _decimals: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      notation: metadata.supply >= 1000000 ? 'compact' : 'standard',
    }).format(metadata.supply);
  };

  // For live preview, return just the inner content without the card wrapper
  return (
    <div className="bg-card rounded-lg p-4 border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Token Icon */}
          <div className="relative">
            {metadata.imageUrl && !imageError ? (
              <img
                src={metadata.imageUrl}
                alt={`${metadata.name} icon`}
                className="w-12 h-12 rounded-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center bg-muted justify-center text-muted-foreground text-xs">
                {metadata.symbol ? metadata.symbol.substring(0, 4).toUpperCase() : '?'}
              </div>
            )}
          </div>

          {/* Token Info */}
          <div>
            <h3 className="text-md">{metadata.name || 'Unnamed Token'}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {formatSupply(metadata.supply, metadata.decimals)} {metadata.symbol || 'TOKEN'}
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="text-right">
          <div className="text-md">
            -
          </div>
          <div className="text-sm text-muted-foreground">
            -
          </div>
        </div>
      </div>
    </div>
  );
} 