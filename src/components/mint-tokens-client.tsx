'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createMintToInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { Metadata, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe } from 'lucide-react';

import { useNetwork } from '@/components/wallet-provider';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/seperator';
import { MintSelect } from '@/components/mint-select';

const mintSchema = z.object({
  tokenAddress: z.string().min(1, 'Token address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid token address'),
  recipientAddress: z.string().min(1, 'Recipient address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid recipient address'),
  amount: z.number().min(0.000000001, 'Amount must be greater than 0'),
});

type MintFormData = z.infer<typeof mintSchema>;

export function MintTokensClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    address?: string;
    name?: string;
    symbol?: string;
    decimals: number;
    supply?: string;
  } | null>(null);

  const form = useForm<MintFormData>({
    resolver: zodResolver(mintSchema),
    defaultValues: {
      tokenAddress: '',
      recipientAddress: '',
      amount: 1000000000,
    },
  });

  const fetchTokenInfo = async (tokenAddress: string) => {
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
      const mintAuthority = parsedData.info.mintAuthority;

      if (!mintAuthority) {
        throw new Error('This token has no mint authority - cannot mint additional tokens');
      }

      if (mintAuthority !== publicKey?.toString()) {
        throw new Error('You are not the mint authority for this token');
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
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
      setTokenInfo(null);
    }
  };

  const onSubmit = async (data: MintFormData) => {
    if (!publicKey) {
      setError('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    setIsMinting(true);
    setError(null);
    setMintResult(null);

    try {
      const mintPubkey = new PublicKey(data.tokenAddress);
      const recipientPubkey = new PublicKey(data.recipientAddress);

      // Get token info for decimals
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      if (!mintInfo.value?.data || typeof mintInfo.value.data !== 'object' || !('parsed' in mintInfo.value.data)) {
        throw new Error('Invalid token address');
      }
      const decimals = (mintInfo.value.data.parsed as any).info.decimals;

      // Calculate mint amount with decimals
      const mintAmount = Math.floor(data.amount * Math.pow(10, decimals));

      // Get or create associated token account for recipient
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      const transaction = new Transaction();

      // Check if recipient token account exists
      try {
        await getAccount(connection, recipientTokenAccount);
      } catch (error) {
        // Account doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientTokenAccount,
            recipientPubkey, // owner
            mintPubkey // mint
          )
        );
      }

      // Add mint instruction
      transaction.add(
        createMintToInstruction(
          mintPubkey,
          recipientTokenAccount,
          publicKey, // mint authority
          mintAmount
        )
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setMintResult(signature);
      form.reset();
      setTokenInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint tokens');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Mint Additional Tokens</CardTitle>
          <CardDescription>
            Mint additional tokens from a token you own and control the mint authority for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to mint tokens.
              </AlertDescription>
            </Alert>
          )}

          {mintResult ? (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 gap-2">
                <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                        <span className="text-2xl">✅</span>
                        Tokens Minted Successfully!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p>
                          Your tokens have been minted successfully! They have been sent to the recipient address you provided.
                        </p>
                        <div>
                            <p className="text-sm font-medium mb-2">
                                <strong>Transaction Signature:</strong>
                            </p>
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg font-mono text-xs break-all relative group">
                                {mintResult}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => navigator.clipboard.writeText(mintResult)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`https://explorer.solana.com/tx/${mintResult}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank')}
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
                                  const url = `https://solscan.io${solscanNetwork}/tx/${mintResult}`;
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
                                    setMintResult(null);
                                }}
                                className="w-full"
                            >
                                Mint More Tokens
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
                          <div className="space-y-3">
                            <div>
                              <MintSelect
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (value && value !== 'no-mints') {
                                    fetchTokenInfo(value);
                                  }
                                }}
                                onTokenSelect={(token) => {
                                  setTokenInfo({
                                    address: token.address,
                                    name: token.name,
                                    symbol: token.symbol,
                                    decimals: token.decimals,
                                    supply: token.supply,
                                  });
                                }}
                                placeholder="Select from your tokens..."
                              />
                            </div>
                            <div className="text-sm text-muted-foreground text-center">
                              Or enter manually:
                            </div>
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
                          </div>
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
                        <div><strong>Current Supply:</strong> {tokenInfo.supply}</div>
                      </div>
                    </div>
                  )}

                  <Separator text="Mint Details" bg="bg-card" />

                  <FormField
                    control={form.control}
                    name="recipientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Address</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter recipient wallet address..."
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (publicKey) {
                                  field.onChange(publicKey.toString());
                                }
                              }}
                              disabled={!publicKey}
                            >
                              Use My Wallet
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Mint</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Enter amount..."
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!publicKey || isMinting || !tokenInfo}
                  >
                    {isMinting ? 'Minting Tokens...' : 'Mint Tokens'}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
  );
} 