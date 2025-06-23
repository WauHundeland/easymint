'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createToken, estimateCreateTokenFee } from '@/lib/createTokenWithUpload';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNetwork } from '@/components/wallet-provider';
import { ConfirmationDialog } from './confirmation-dialog';
import { SuccessDisplay } from './success-display';
import { CoinCreatorForm } from './coin-creator-form';
import { useSolUsdRate } from './use-sol-usd-rate';
import { coinSchema, CoinFormData } from './types';

export function CoinCreator() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { solUsdRate } = useSolUsdRate();

  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [feeError, setFeeError] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CoinFormData | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const form = useForm<CoinFormData>({
    resolver: zodResolver(coinSchema),
    defaultValues: {
      creationType: 'token',
      name: '',
      symbol: '',
      description: '',
      decimals: 9,
      supply: 1000000,
      imageFile: undefined,
      revokeMintAuthority: false,
      revokeFreezeAuthority: false,
    },
  });

  // Watch form values that affect transaction fees
  const revokeMintAuthority = form.watch('revokeMintAuthority');
  const revokeFreezeAuthority = form.watch('revokeFreezeAuthority');
  const decimals = form.watch('decimals');
  const supply = form.watch('supply');
  const creationType = form.watch('creationType');

  // Debounce timer ref
  const debounceTimerRef = useRef<number | undefined>(undefined);

  // Memoized fee estimation function
  const estimateFee = useCallback(async () => {
    if (!publicKey) {
      setEstimatedFee(null);
      setFeeError(false);
      return;
    }

    setLoadingFee(true);
    setFeeError(false);
    try {
      const formData = {
        creationType,
        decimals,
        supply,
        revokeMintAuthority,
        revokeFreezeAuthority,
        // These don't affect fee calculation, use dummy values
        name: 'dummy',
        symbol: 'dummy',
        description: '',
        imageFile: undefined,
      };
      const fee = await estimateCreateTokenFee(connection, publicKey, formData);
      setEstimatedFee(fee);
    } catch (error) {
      console.error('Error estimating fee:', error);
      setEstimatedFee(null);
      setFeeError(true);
    } finally {
      setLoadingFee(false);
    }
  }, [publicKey, connection, revokeMintAuthority, revokeFreezeAuthority, decimals, supply, creationType]);

  // Debounced fee estimation effect
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = window.setTimeout(() => {
      void estimateFee();
    }, 300); // 300ms debounce

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [estimateFee]);

  const onSubmit = async (data: CoinFormData) => {
    if (!publicKey) {
      alert('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    setPendingFormData(data);
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (!pendingFormData || !publicKey) return;

    // Check if user has sufficient balance
    if (estimatedFee) {
      try {
        const balance = await connection.getBalance(publicKey);
        const requiredBalance = estimatedFee + (0.001 * LAMPORTS_PER_SOL); // Add small buffer for potential fee changes
        
        if (balance < requiredBalance) {
          const balanceInSol = balance / LAMPORTS_PER_SOL;
          const requiredInSol = requiredBalance / LAMPORTS_PER_SOL;
          alert(`Insufficient balance. You have ${balanceInSol.toFixed(6)} SOL but need at least ${requiredInSol.toFixed(6)} SOL to create this token.`);
          return;
        }
      } catch (error) {
        console.error('Error checking balance:', error);
        alert('Unable to verify your balance. Please try again.');
        return;
      }
    }

    setShowConfirmDialog(false);
    setIsCreating(true);
    setCreatedToken(null);

    try {
      const result = await createToken(connection, publicKey, sendTransaction, pendingFormData);
      setCreatedToken(result.mintPubkey.toString());

      form.reset({
        creationType: 'token',
        name: '',
        symbol: '',
        description: '',
        decimals: 9,
        supply: 1000000,
        imageFile: undefined,
        revokeMintAuthority: false,
        revokeFreezeAuthority: false,
      });
      setSelectedFileName('');
    } catch (error) {
      console.error('Error creating token:', error);

      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds. Make sure you have enough SOL to cover transaction fees.');
        } else if (error.message.includes('blockhash not found')) {
          alert('Transaction expired. Please try again.');
        } else if (error.message.includes('User rejected')) {
          alert('Transaction was rejected by user.');
        } else if (error.message.includes('R2 not configured') || error.message.includes('Missing environment variables')) {
          alert('Image upload service is not configured. Please contact the administrator to set up Cloudflare R2 storage. You can create a token without an image for now.');
        } else if (error.message.includes('Upload failed') || error.message.includes('Failed to upload')) {
          alert('Failed to upload image to storage. Please check your internet connection and try again, or create a token without an image.');
        } else if (error.message.includes('Metadata upload failed')) {
          alert('Failed to upload token metadata. Please check your internet connection and try again.');
        } else {
          alert(`Failed to create token: ${error.message}`);
        }
      } else {
        alert('Failed to create token. Please try again.');
      }
    } finally {
      setIsCreating(false);
      setPendingFormData(null);
    }
  };

  const resetForm = () => {
    setCreatedToken(null);
    setSelectedFileName('');
    form.reset({
      creationType: 'token',
      name: '',
      symbol: '',
      description: '',
      decimals: 9,
      supply: 1000000,
      imageFile: undefined,
      revokeMintAuthority: false,
      revokeFreezeAuthority: false,
    });
  };

  return (
    <>
      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirm}
        formData={pendingFormData}
        network={network}
        estimatedFee={estimatedFee}
        solUsdRate={solUsdRate}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Your Solana Token</CardTitle>
          <CardDescription>
            Create your own cryptocurrency token on the Solana blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!createdToken ? (
            <CoinCreatorForm
              form={form}
              onSubmit={onSubmit}
              publicKey={publicKey}
              network={network}
              isCreating={isCreating}
              estimatedFee={estimatedFee}
              loadingFee={loadingFee}
              feeError={feeError}
              solUsdRate={solUsdRate}
              selectedFileName={selectedFileName}
              setSelectedFileName={setSelectedFileName}
            />
          ) : (
            <div className="space-y-6">
              <SuccessDisplay
                tokenAddress={createdToken}
                network={network}
                onCreateAnother={resetForm}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
} 