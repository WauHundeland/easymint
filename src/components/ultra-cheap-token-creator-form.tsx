'use client';

import { UseFormReturn } from 'react-hook-form';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingDown, Info, AlertTriangle } from 'lucide-react';

import { TokenFeeDisplay } from './token-fee-display';
import { TokenPreview } from './token-preview';
import { Separator } from './seperator';
import { UltraCheapBasicDetailsForm } from './ultra-cheap-basic-details-form';
import { UltraCheapTokenConfigurationForm } from './ultra-cheap-token-configuration-form';

interface UltraCheapTokenFormData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
}

interface UltraCheapTokenCreatorFormProps {
  form: UseFormReturn<UltraCheapTokenFormData>;
  onSubmit: (data: UltraCheapTokenFormData) => void;
  publicKey: any;
  network: WalletAdapterNetwork;
  isCreating: boolean;
  estimatedFee: number | null;
  loadingFee: boolean;
  feeError: boolean;
  solUsdRate: number | null;
}

export function UltraCheapTokenCreatorForm({
  form,
  onSubmit,
  publicKey,
  network,
  isCreating,
  estimatedFee,
  loadingFee,
  feeError,
  solUsdRate,
}: UltraCheapTokenCreatorFormProps) {
  return (
    <>
      {/* Cost Savings Alert */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Ultra Cheap Mode:</strong> This creator removes all non-essential operations to minimize costs:
          <ul className="mt-2 space-y-1 text-sm">
            <li>• No metadata creation (saves ~0.01 SOL + metadata account rent)</li>
            <li>• No Metaplex protocol fees (saves 0.01 SOL)</li>
            <li>• No image upload (no storage costs)</li>
            <li>• No authority revocation options</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* What to Expect Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>What to expect:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Your token will show as "Unknown Token" in wallets</li>
            <li>• No name, symbol, or image will be displayed</li>
            <li>• The token functions normally for all operations</li>
            <li>• You can add metadata later if needed</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to create a token.
              </AlertDescription>
            </Alert>
          )}

          <UltraCheapBasicDetailsForm form={form} />
          <UltraCheapTokenConfigurationForm form={form} />

          <Separator text="Preview" bg="bg-card" />

          {/* Live Preview Section */}
          {(() => {
            const formValues = form.watch();

            return (
              <div className="space-y-3">
                <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
                    <strong>Preview Note:</strong> This shows how your token would look WITH metadata. 
                    Your actual ultra-cheap token will appear as "Unknown Token" in wallets.
                  </AlertDescription>
                </Alert>
                
                <TokenPreview
                  metadata={{
                    name: formValues.name || '',
                    symbol: formValues.symbol || '',
                    description: 'Ultra-cheap token (no metadata)',
                    imageUrl: undefined,
                    supply: formValues.supply || 1000000,
                    decimals: formValues.decimals ?? 9,
                  }}
                  network={network}
                  isLivePreview={true}
                />
              </div>
            );
          })()}

          <Separator text="Create Ultra Cheap Token" bg="bg-card" />

          <TokenFeeDisplay
            estimatedFee={estimatedFee}
            loadingFee={loadingFee}
            network={network}
            solUsdRate={solUsdRate}
            error={feeError}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={!publicKey || isCreating || loadingFee || feeError}
          >
            {isCreating ? (
              'Creating Ultra Cheap Token...'
            ) : loadingFee ? (
              'Calculating Cost...'
            ) : estimatedFee && solUsdRate ? (
              network === WalletAdapterNetwork.Mainnet
                ? `Create Ultra Cheap Token (${(estimatedFee / LAMPORTS_PER_SOL).toFixed(4)} SOL / $${((estimatedFee / LAMPORTS_PER_SOL) * solUsdRate).toFixed(2)})`
                : `Create Ultra Cheap Token (${(estimatedFee / LAMPORTS_PER_SOL).toFixed(4)} SOL Devnet)`
            ) : (
              'Create Ultra Cheap Token'
            )}
          </Button>
        </form>
      </Form>
    </>
  );
} 