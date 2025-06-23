'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createSetAuthorityInstruction, AuthorityType } from '@solana/spl-token';
import { Metadata, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe, Shield, ShieldOff, Coins, Snowflake } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

import { useNetwork } from '@/components/wallet-provider';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/seperator';
import { MintSelect } from '@/components/mint-select';

const revokeSchema = z.object({
  tokenAddress: z.string().min(1, 'Token address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid token address'),
  revokeMintAuthority: z.boolean().default(false),
  revokeFreezeAuthority: z.boolean().default(false),
}).refine((data) => {
  return data.revokeMintAuthority || data.revokeFreezeAuthority;
}, {
  message: 'Please select at least one authority to revoke',
  path: ['revokeMintAuthority'],
});

type RevokeFormData = z.infer<typeof revokeSchema>;

export function RevokeAuthoritiesClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeResult, setRevokeResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    address?: string;
    name?: string;
    symbol?: string;
    decimals: number;
    supply?: string;
    mintAuthority?: string | null;
    freezeAuthority?: string | null;
  } | null>(null);

  const form = useForm<RevokeFormData>({
    resolver: zodResolver(revokeSchema),
    defaultValues: {
      tokenAddress: '',
      revokeMintAuthority: false,
      revokeFreezeAuthority: false,
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
      const freezeAuthority = parsedData.info.freezeAuthority;

      // Check if user has any authorities
      const hasMintAuthority = mintAuthority === publicKey?.toString();
      const hasFreezeAuthority = freezeAuthority === publicKey?.toString();

      if (!hasMintAuthority && !hasFreezeAuthority) {
        throw new Error('You do not have mint or freeze authority for this token');
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
        mintAuthority,
        freezeAuthority,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
      setTokenInfo(null);
    }
  };

  const onSubmit = async (data: RevokeFormData) => {
    if (!publicKey) {
      setError('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    if (!tokenInfo) {
      setError('Please select a valid token first.');
      return;
    }

    // Validate authorities before proceeding
    if (data.revokeMintAuthority && tokenInfo.mintAuthority !== publicKey.toString()) {
      setError('You do not have mint authority for this token.');
      return;
    }

    if (data.revokeFreezeAuthority && tokenInfo.freezeAuthority !== publicKey.toString()) {
      setError('You do not have freeze authority for this token.');
      return;
    }

    if (data.revokeMintAuthority && !tokenInfo.mintAuthority) {
      setError('Mint authority has already been revoked for this token.');
      return;
    }

    if (data.revokeFreezeAuthority && !tokenInfo.freezeAuthority) {
      setError('Freeze authority has already been revoked for this token.');
      return;
    }

    setIsRevoking(true);
    setError(null);
    setRevokeResult(null);

    try {
      const mintPubkey = new PublicKey(data.tokenAddress);
      const transaction = new Transaction();

      // Add revoke mint authority instruction
      if (data.revokeMintAuthority) {
        transaction.add(
          createSetAuthorityInstruction(
            mintPubkey,
            publicKey, // current authority
            AuthorityType.MintTokens,
            null // new authority (null = revoke)
          )
        );
      }

      // Add revoke freeze authority instruction
      if (data.revokeFreezeAuthority) {
        transaction.add(
          createSetAuthorityInstruction(
            mintPubkey,
            publicKey, // current authority
            AuthorityType.FreezeAccount,
            null // new authority (null = revoke)
          )
        );
      }

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setRevokeResult(signature);
      form.reset();
      setTokenInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke authorities');
    } finally {
      setIsRevoking(false);
    }
  };

  const canRevokeMint = tokenInfo?.mintAuthority === publicKey?.toString();
  const canRevokeFreeze = tokenInfo?.freezeAuthority === publicKey?.toString();
  const mintAlreadyRevoked = tokenInfo ? !tokenInfo.mintAuthority : false;
  const freezeAlreadyRevoked = tokenInfo ? !tokenInfo.freezeAuthority : false;

  return (
    <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Revoke Token Authorities</CardTitle>
          <CardDescription>
            Permanently revoke mint and/or freeze authorities from your tokens to make them immutable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to revoke authorities.
              </AlertDescription>
            </Alert>
          )}

          {revokeResult ? (
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 gap-2">
                <CardHeader>
                    <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
                        <span className="text-2xl">🔒</span>
                        Authorities Revoked Successfully!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p>
                          Your token authorities have been permanently revoked! This action cannot be undone.
                        </p>
                        <div>
                            <p className="text-sm font-medium mb-2">
                                <strong>Transaction Signature:</strong>
                            </p>
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg font-mono text-xs break-all relative group">
                                {revokeResult}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => navigator.clipboard.writeText(revokeResult)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`https://explorer.solana.com/tx/${revokeResult}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank')}
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
                                  const url = `https://solscan.io${solscanNetwork}/tx/${revokeResult}`;
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
                                    setRevokeResult(null);
                                }}
                                className="w-full"
                            >
                                Revoke More Authorities
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
                                onValueChange={(value: string) => {
                                  field.onChange(value);
                                  if (value && value !== 'no-mints') {
                                    fetchTokenInfo(value);
                                  }
                                }}
                                onTokenSelect={(token: any) => {
                                  setTokenInfo({
                                    address: token.address,
                                    name: token.name,
                                    symbol: token.symbol,
                                    decimals: token.decimals,
                                    supply: token.supply,
                                    mintAuthority: token.mintAuthority,
                                    freezeAuthority: undefined,
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
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <strong>Mint Authority:</strong> 
                            {tokenInfo.mintAuthority ? (
                              <span className="text-green-600 dark:text-green-400">Active</span>
                            ) : (
                              <span className="text-gray-500">Revoked</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Snowflake className="h-4 w-4" />
                            <strong>Freeze Authority:</strong> 
                            {tokenInfo.freezeAuthority ? (
                              <span className="text-green-600 dark:text-green-400">Active</span>
                            ) : (
                              <span className="text-gray-500">Revoked</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator text="Authorities to Revoke" bg="bg-card" />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="revokeMintAuthority"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!canRevokeMint || mintAlreadyRevoked}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={`text-sm font-medium flex items-center gap-2 ${
                              !canRevokeMint || mintAlreadyRevoked ? 'text-muted-foreground' : ''
                            }`}>
                              <Coins className="h-4 w-4" />
                              Revoke Mint Authority
                              {mintAlreadyRevoked && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Already Revoked</span>}
                              {!canRevokeMint && !mintAlreadyRevoked && <span className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">No Authority</span>}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Permanently disable the ability to mint additional tokens (creates fixed supply)
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="revokeFreezeAuthority"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!canRevokeFreeze || freezeAlreadyRevoked}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={`text-sm font-medium flex items-center gap-2 ${
                              !canRevokeFreeze || freezeAlreadyRevoked ? 'text-muted-foreground' : ''
                            }`}>
                              <Snowflake className="h-4 w-4" />
                              Revoke Freeze Authority
                              {freezeAlreadyRevoked && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Already Revoked</span>}
                              {!canRevokeFreeze && !freezeAlreadyRevoked && <span className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">No Authority</span>}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Permanently disable the ability to freeze token accounts (ensures always transferable)
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormMessage />
                  </div>

                  {tokenInfo && (canRevokeMint || canRevokeFreeze) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
                      <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <ShieldOff className="h-4 w-4" />
                        ⚠️ Warning: This Action is Permanent
                      </h5>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                        <p>
                          Revoking authorities is <strong>irreversible</strong>. Once revoked, you will never be able to:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          {form.watch('revokeMintAuthority') && <li>Mint additional tokens (supply becomes fixed forever)</li>}
                          {form.watch('revokeFreezeAuthority') && <li>Freeze or unfreeze any token accounts</li>}
                        </ul>
                        <p className="pt-2">
                          <strong>This increases trust</strong> as holders know the token rules cannot change.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !publicKey || 
                      isRevoking || 
                      !tokenInfo || 
                      (!form.watch('revokeMintAuthority') && !form.watch('revokeFreezeAuthority')) ||
                      (!canRevokeMint && !canRevokeFreeze)
                    }
                  >
                    {isRevoking 
                      ? 'Revoking Authorities...' 
                      : !tokenInfo
                      ? 'Select a token to continue'
                      : (!canRevokeMint && !canRevokeFreeze)
                      ? 'No authorities available to revoke'
                      : 'Revoke Selected Authorities'
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