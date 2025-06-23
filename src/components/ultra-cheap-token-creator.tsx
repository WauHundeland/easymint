'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createUltraCheapToken, estimateUltraCheapTokenFee, UltraCheapTokenData } from '@/lib/createTokenWithUpload';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNetwork } from '@/components/wallet-provider';
import { useSolUsdRate } from './coin-creator/use-sol-usd-rate';
import { UltraCheapTokenCreatorForm } from './ultra-cheap-token-creator-form';
import { UltraCheapSuccessDisplay } from './ultra-cheap-success-display';

// Schema for ultra-cheap token form
const ultraCheapTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(32, 'Token name must be 32 characters or less'),
  symbol: z.string().min(1, 'Token symbol is required').max(10, 'Token symbol must be 10 characters or less'),
  decimals: z.number().min(0).max(9).default(9),
  supply: z.number().min(1, 'Supply must be at least 1').max(1000000000000, 'Supply too large'),
});

type UltraCheapTokenFormData = z.infer<typeof ultraCheapTokenSchema>;

export function UltraCheapTokenCreator() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { solUsdRate } = useSolUsdRate();

  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [feeError, setFeeError] = useState(false);

  const form = useForm<UltraCheapTokenFormData>({
    resolver: zodResolver(ultraCheapTokenSchema),
    defaultValues: {
      name: '',
      symbol: '',
      decimals: 9,
      supply: 1000000,
    },
  });

  // Watch form values that affect transaction fees
  const decimals = form.watch('decimals');
  const supply = form.watch('supply');

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
      const formData: UltraCheapTokenData = {
        name: 'dummy',
        symbol: 'dummy',
        decimals,
        supply,
      };
      const fee = await estimateUltraCheapTokenFee(connection, publicKey, formData);
      setEstimatedFee(fee);
    } catch (error) {
      console.error('Error estimating fee:', error);
      setEstimatedFee(null);
      setFeeError(true);
    } finally {
      setLoadingFee(false);
    }
  }, [publicKey, connection, decimals, supply]);

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

  const onSubmit = async (data: UltraCheapTokenFormData) => {
    if (!publicKey) {
      alert('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    // Check if user has sufficient balance
    if (estimatedFee) {
      try {
        const balance = await connection.getBalance(publicKey);
        const requiredBalance = estimatedFee + (0.001 * LAMPORTS_PER_SOL); // Add small buffer
        
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

    setIsCreating(true);
    setCreatedToken(null);

    try {
      console.log('Starting ultra cheap token creation with data:', data);
      console.log('Network:', network);
      console.log('Public key:', publicKey.toString());
      
      const result = await createUltraCheapToken(connection, publicKey, sendTransaction, data);
      console.log('Token creation successful, mint address:', result.mintPubkey.toString());
      
      setCreatedToken(result.mintPubkey.toString());

      form.reset({
        name: '',
        symbol: '',
        decimals: 9,
        supply: 1000000,
      });
    } catch (error) {
      console.error('Error creating ultra cheap token:', error);

      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          alert('Insufficient funds. Make sure you have enough SOL to cover transaction fees and rent exemption.');
        } else if (error.message.includes('blockhash not found')) {
          alert('Transaction expired. Please try again.');
        } else if (error.message.includes('User rejected')) {
          alert('Transaction was rejected by user.');
        } else if (error.message.includes('Transaction was not confirmed')) {
          alert('Transaction was not confirmed within the expected time. Please check the Solana explorer to see if your token was created.');
        } else {
          alert(`Failed to create ultra cheap token: ${error.message}`);
        }
      } else {
        alert('Failed to create ultra cheap token. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setCreatedToken(null);
    form.reset({
      name: '',
      symbol: '',
      decimals: 9,
      supply: 1000000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create Your Ultra Cheap Token</CardTitle>
        <CardDescription>
          Create your own cryptocurrency token on Solana with minimal cost - no metadata, no fees, no extras
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!createdToken ? (
          <UltraCheapTokenCreatorForm
            form={form}
            onSubmit={onSubmit}
            publicKey={publicKey}
            network={network}
            isCreating={isCreating}
            estimatedFee={estimatedFee}
            loadingFee={loadingFee}
            feeError={feeError}
            solUsdRate={solUsdRate}
          />
        ) : (
          <div className="space-y-6">
            <UltraCheapSuccessDisplay
              tokenAddress={createdToken}
              network={network}
              onCreateAnother={resetForm}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 