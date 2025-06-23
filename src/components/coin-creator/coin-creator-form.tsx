'use client';

import { UseFormReturn } from 'react-hook-form';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

import { TokenFeeDisplay } from '../token-fee-display';
import { TokenPreview } from '../token-preview';
import { Separator } from '../seperator';
import { CreationTypeForm } from './creation-type-form';
import { BasicDetailsForm } from './basic-details-form';
import { TokenConfigurationForm } from './token-configuration-form';
import { CoinFormData } from './types';
import { Alert, AlertDescription } from '../ui/alert';

interface CoinCreatorFormProps {
  form: UseFormReturn<CoinFormData>;
  onSubmit: (data: CoinFormData) => void;
  publicKey: any;
  network: WalletAdapterNetwork;
  isCreating: boolean;
  estimatedFee: number | null;
  loadingFee: boolean;
  feeError: boolean;
  solUsdRate: number | null;
  selectedFileName: string;
  setSelectedFileName: (fileName: string) => void;
}

export function CoinCreatorForm({
  form,
  onSubmit,
  publicKey,
  network,
  isCreating,
  estimatedFee,
  loadingFee,
  feeError,
  solUsdRate,
  selectedFileName,
  setSelectedFileName,
}: CoinCreatorFormProps) {
  const creationType = form.watch('creationType');
  const isNFT = creationType === 'nft';
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to create a token.
              </AlertDescription>
            </Alert>
          )}

          <CreationTypeForm form={form} />
          <BasicDetailsForm form={form} selectedFileName={selectedFileName} setSelectedFileName={setSelectedFileName} />
          <TokenConfigurationForm form={form} />

          <Separator text="Preview" bg="bg-card" />

          {/* Live Preview Section */}
          {(() => {
            const formValues = form.watch();
            const imageUrl = formValues.imageFile && selectedFileName
              ? URL.createObjectURL(formValues.imageFile as File)
              : undefined;

            return (
              <TokenPreview
                metadata={{
                  name: formValues.name || '',
                  symbol: formValues.symbol || '',
                  description: formValues.description || '',
                  imageUrl,
                  supply: formValues.supply || 1000000,
                  decimals: formValues.decimals ?? 9,
                }}
                network={network}
                isLivePreview={true}
              />
            );
          })()}

          <Separator text={`Create ${isNFT ? 'NFT' : 'Token'}`} bg="bg-card" />

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
              `Creating ${isNFT ? 'NFT' : 'Token'}...`
            ) : loadingFee ? (
              'Calculating Cost...'
            ) : estimatedFee && solUsdRate ? (
              network === WalletAdapterNetwork.Mainnet
                ? `Create ${isNFT ? 'NFT' : 'Token'} (${(estimatedFee / LAMPORTS_PER_SOL).toFixed(4)} SOL / $${((estimatedFee / LAMPORTS_PER_SOL) * solUsdRate).toFixed(2)})`
                : `Create ${isNFT ? 'NFT' : 'Token'} (${(estimatedFee / LAMPORTS_PER_SOL).toFixed(4)} SOL Devnet)`
            ) : (
              `Create ${isNFT ? 'NFT' : 'Token'}`
            )}
          </Button>
        </form>
      </Form>
    </>
  );
} 