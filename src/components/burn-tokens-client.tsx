'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createBurnInstruction, getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { Metadata, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe, Flame, AlertTriangle } from 'lucide-react';

import { useNetwork } from '@/components/wallet-provider';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/seperator';

const burnSchema = z.object({
  tokenAddress: z.string().min(1, 'Token address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid token address'),
  amount: z.number().min(0.000000001, 'Amount must be greater than 0'),
});

type BurnFormData = z.infer<typeof burnSchema>;

export function BurnTokensClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const [isBurning, setIsBurning] = useState(false);
  const [burnResult, setBurnResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    address?: string;
    name?: string;
    symbol?: string;
    decimals: number;
    supply?: string;
    userBalance?: string;
    userBalanceRaw?: number;
  } | null>(null);

  const form = useForm<BurnFormData>({
    resolver: zodResolver(burnSchema),
    defaultValues: {
      tokenAddress: '',
      amount: 1,
    },
  });

  const fetchTokenInfo = async (tokenAddress: string) => {
    if (!publicKey) return;
    
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      
      if (!mintInfo.value || !mintInfo.value.data || typeof mintInfo.value.data !== 'object' || !('parsed' in mintInfo.value.data)) {
        throw new Error('Invalid token address or not a token mint');
      }

      const parsedData = mintInfo.value.data.parsed;
      if (parsedData.type !== 'mint') {
        throw new Error('Address is not a token mint');
      }

      const decimals = parsedData.info.decimals;
      const supply = parsedData.info.supply;

      // Get user's token account balance
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      let userBalance = 0;
      let userBalanceFormatted = '0';
      
      try {
        const accountData = await getAccount(connection, userTokenAccount);
        userBalance = Number(accountData.amount);
        userBalanceFormatted = (userBalance / Math.pow(10, decimals)).toLocaleString();
      } catch (error) {
        // Account doesn't exist, balance is 0
        userBalance = 0;
        userBalanceFormatted = '0';
      }

      // Try to fetch metadata
      let tokenMetadata: { name?: string; symbol?: string } = { name: undefined, symbol: undefined };
      try {
        const metadataPDA = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            METADATA_PROGRAM_ID.toBuffer(),
            mintPubkey.toBuffer(),
          ],
          METADATA_PROGRAM_ID
        )[0];
        
        const metadataAccount = await connection.getAccountInfo(metadataPDA);
        if (metadataAccount) {
          const [metadata, _] = Metadata.fromAccountInfo(metadataAccount);
          tokenMetadata.name = metadata.data.name.replace(/\0/g, '');
          tokenMetadata.symbol = metadata.data.symbol.replace(/\0/g, '');
        }
      } catch (e) {
        console.log('No metadata found or error fetching metadata');
      }

      setTokenInfo({
        address: tokenAddress,
        ...tokenMetadata,
        decimals,
        supply: (parseInt(supply) / Math.pow(10, decimals)).toLocaleString(),
        userBalance: userBalanceFormatted,
        userBalanceRaw: userBalance,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
      setTokenInfo(null);
    }
  };

  const onSubmit = async (data: BurnFormData) => {
    if (!publicKey) {
      setError('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    if (!tokenInfo) {
      setError('Please enter a valid token address first.');
      return;
    }

    if (!tokenInfo.userBalanceRaw || tokenInfo.userBalanceRaw === 0) {
      setError('You have no tokens to burn for this token.');
      return;
    }

    // Check if user has enough tokens
    const burnAmountRaw = Math.floor(data.amount * Math.pow(10, tokenInfo.decimals));
    if (burnAmountRaw > tokenInfo.userBalanceRaw) {
      setError(`Insufficient balance. You have ${tokenInfo.userBalance} ${tokenInfo.symbol || 'tokens'} but trying to burn ${data.amount}.`);
      return;
    }

    setIsBurning(true);
    setError(null);
    setBurnResult(null);

    try {
      const mintPubkey = new PublicKey(data.tokenAddress);
      
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      const transaction = new Transaction();

      // Add burn instruction
      transaction.add(
        createBurnInstruction(
          userTokenAccount, // token account
          mintPubkey, // mint
          publicKey, // owner
          burnAmountRaw // amount
        )
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setBurnResult(signature);
      form.reset();
      
      // Refresh token info to show updated balance
      await fetchTokenInfo(data.tokenAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to burn tokens');
    } finally {
      setIsBurning(false);
    }
  };

  const maxBurnAmount = tokenInfo?.userBalanceRaw && tokenInfo.decimals !== undefined ? tokenInfo.userBalanceRaw / Math.pow(10, tokenInfo.decimals) : 0;

  return (
    <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Burn Tokens</CardTitle>
          <CardDescription>
            Permanently destroy tokens from your wallet to reduce total supply
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to burn tokens.
              </AlertDescription>
            </Alert>
          )}

          {burnResult ? (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 gap-2">
                <CardHeader>
                    <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        Tokens Burned Successfully!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p>
                          Your tokens have been permanently destroyed! The total supply has been reduced and these tokens can never be recovered.
                        </p>
                        <div>
                            <p className="text-sm font-medium mb-2">
                                <strong>Transaction Signature:</strong>
                            </p>
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg font-mono text-xs break-all relative group">
                                {burnResult}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => navigator.clipboard.writeText(burnResult)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`https://explorer.solana.com/tx/${burnResult}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank')}
                                className="w-full"
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View on Solana Explorer
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const solscanNetwork = network === WalletAdapterNetwork.Mainnet ? '' : `/${network}`;
                                  const url = `https://solscan.io${solscanNetwork}/tx/${burnResult}`;
                                  window.open(url, '_blank');
                                }}
                                className="w-full"
                            >
                                <Globe className="mr-2 h-4 w-4" />
                                View on Solscan
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setBurnResult(null);
                                }}
                                className="w-full"
                            >
                                Burn More Tokens
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
          ) : (
            <>
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <Separator text="Token Information" bg="bg-card" />

                  <FormField
                    control={form.control}
                    name="tokenAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Mint Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter token mint address..."
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              if (e.target.value.length > 32) {
                                fetchTokenInfo(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {tokenInfo && (
                    <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                      <h4 className="font-medium">Token Details</h4>
                      <div className="text-sm space-y-1">
                        {tokenInfo.name && <div><strong>Name:</strong> {tokenInfo.name}</div>}
                        {tokenInfo.symbol && <div><strong>Symbol:</strong> {tokenInfo.symbol}</div>}
                        <div><strong>Decimals:</strong> {tokenInfo.decimals}</div>
                        <div><strong>Total Supply:</strong> {tokenInfo.supply}</div>
                        <div className="pt-2 border-t">
                          <div><strong>Your Balance:</strong> {tokenInfo.userBalance} {tokenInfo.symbol || 'tokens'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tokenInfo && tokenInfo.userBalanceRaw === 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        You don't have any of these tokens to burn. You need to own tokens before you can burn them.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator text="Burn Details" bg="bg-card" />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Burn</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max={maxBurnAmount}
                                placeholder="Enter amount..."
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                                                             {tokenInfo && tokenInfo.userBalanceRaw && tokenInfo.userBalanceRaw > 0 && (
                                 <Button
                                   type="button"
                                   variant="outline"
                                   onClick={() => {
                                     field.onChange(maxBurnAmount);
                                   }}
                                 >
                                   Max
                                 </Button>
                               )}
                             </div>
                             {tokenInfo && tokenInfo.userBalanceRaw && tokenInfo.userBalanceRaw > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Available to burn: {tokenInfo.userBalance} {tokenInfo.symbol || 'tokens'}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {tokenInfo && form.watch('amount') > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                      <h5 className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        ⚠️ Warning: This Action is Permanent
                      </h5>
                      <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        <p>
                          You are about to <strong>permanently destroy {form.watch('amount')} {tokenInfo.symbol || 'tokens'}</strong>.
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>These tokens will be <strong>completely destroyed</strong></li>
                          <li>The total supply will be <strong>permanently reduced</strong></li>
                          <li>This action <strong>cannot be undone</strong></li>
                          <li>No one can recover these tokens</li>
                        </ul>
                        <p className="pt-2">
                          <strong>Burning tokens is deflationary</strong> and may increase the value of remaining tokens.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !publicKey || 
                      isBurning || 
                      !tokenInfo || 
                      !tokenInfo.userBalanceRaw ||
                      tokenInfo.userBalanceRaw === 0 ||
                      form.watch('amount') <= 0 ||
                      form.watch('amount') > maxBurnAmount
                    }
                  >
                    {isBurning 
                      ? 'Burning Tokens...' 
                      : !tokenInfo
                      ? 'Enter token address to continue'
                      : !tokenInfo.userBalanceRaw || tokenInfo.userBalanceRaw === 0
                      ? 'No tokens available to burn'
                      : form.watch('amount') <= 0
                      ? 'Enter amount to burn'
                      : form.watch('amount') > maxBurnAmount
                      ? 'Amount exceeds balance'
                      : `🔥 Burn ${form.watch('amount')} ${tokenInfo.symbol || 'Tokens'}`
                    }
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
  );
} 