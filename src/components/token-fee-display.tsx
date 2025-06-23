import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface TokenFeeDisplayProps {
  estimatedFee: number | null;
  loadingFee: boolean;
  network: WalletAdapterNetwork;
  solUsdRate: number | null;
  error?: boolean;
}

export function TokenFeeDisplay({ estimatedFee, loadingFee, network, solUsdRate, error }: TokenFeeDisplayProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to calculate transaction. Please try refreshing the page or check your wallet connection.
        </AlertDescription>
      </Alert>
    );
  }

  if (estimatedFee === null) return null;

  return (
    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
      <div className="text-sm font-medium mb-1">
        {network === WalletAdapterNetwork.Mainnet ? 'Transaction Cost' : 'Estimated Cost (Devnet)'}
      </div>
      <div className="text-sm text-muted-foreground">
        {loadingFee ? (
          'Loading...'
        ) : (
          <>
            {network === WalletAdapterNetwork.Mainnet ? (
              <>
                <div>{(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL</div>
                {solUsdRate && (
                  <div className="text-xs">
                    ≈ ${((estimatedFee / LAMPORTS_PER_SOL) * solUsdRate).toFixed(2)} USD
                  </div>
                )}
              </>
            ) : (
              <>
                <div>{(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL</div>
                {solUsdRate && (
                  <div className="text-xs mt-1">
                    Mainnet equivalent: ≈ ${((estimatedFee / LAMPORTS_PER_SOL) * solUsdRate).toFixed(2)} USD
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 