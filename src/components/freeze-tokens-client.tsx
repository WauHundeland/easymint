'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createFreezeAccountInstruction, createThawAccountInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { Metadata, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe, Snowflake, Sun } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

import { useNetwork } from '@/components/wallet-provider';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/seperator';
import { FreezeSelect } from '@/components/freeze-select';

const freezeSchema = z.object({
  tokenAddress: z.string().min(1, 'Token address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid token address'),
  targetAddress: z.string().min(1, 'Target address is required').refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid target address'),
  action: z.enum(['freeze', 'unfreeze'], {
    required_error: 'Please select an action',
  }),
});

type FreezeFormData = z.infer<typeof freezeSchema>;

export function FreezeTokensClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const [isProcessing, setIsProcessing] = useState(false);
  const [freezeResult, setFreezeResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    address?: string;
    name?: string;
    symbol?: string;
    decimals: number;
    supply?: string;
  } | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    exists: boolean;
    frozen: boolean;
    balance?: string;
  } | null>(null);

  const form = useForm<FreezeFormData>({
    resolver: zodResolver(freezeSchema),
    defaultValues: {
      tokenAddress: '',
      targetAddress: '',
      action: 'freeze',
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
      const freezeAuthority = parsedData.info.freezeAuthority;

      if (!freezeAuthority) {
        throw new Error('This token has no freeze authority - cannot freeze/unfreeze accounts');
      }

      if (freezeAuthority !== publicKey?.toString()) {
        throw new Error('You are not the freeze authority for this token');
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
      setAccountInfo(null);
    }
  };

  const fetchAccountInfo = async (tokenAddress: string, targetAddress: string) => {
    try {
      const mintPubkey = new PublicKey(tokenAddress);
      const targetPubkey = new PublicKey(targetAddress);
      
      // Get associated token address
      const tokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        targetPubkey
      );

      try {
        const accountData = await getAccount(connection, tokenAccount);
        const balance = Number(accountData.amount) / Math.pow(10, tokenInfo?.decimals || 0);
        
        setAccountInfo({
          exists: true,
          frozen: accountData.isFrozen,
          balance: balance.toLocaleString(),
        });
      } catch (error) {
        // Account doesn't exist
        setAccountInfo({
          exists: false,
          frozen: false,
        });
      }
    } catch (err) {
      console.error('Error fetching account info:', err);
      setAccountInfo(null);
    }
  };

  const onSubmit = async (data: FreezeFormData) => {
    if (!publicKey) {
      setError('Please connect your wallet using the button in the top navigation bar.');
      return;
    }

    // Validate account state before proceeding
    if (accountInfo) {
      if (data.action === 'freeze' && accountInfo.exists && accountInfo.frozen) {
        setError('Cannot freeze account - it is already frozen.');
        return;
      }
      if (data.action === 'unfreeze' && (!accountInfo.exists || !accountInfo.frozen)) {
        setError(accountInfo.exists ? 'Cannot unfreeze account - it is already unfrozen.' : 'Cannot unfreeze account - it does not exist.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setFreezeResult(null);

    try {
      const mintPubkey = new PublicKey(data.tokenAddress);
      const targetPubkey = new PublicKey(data.targetAddress);

      // Get associated token address
      const tokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        targetPubkey
      );

      const transaction = new Transaction();

      // Check if target token account exists
      let accountExists = true;
      try {
        await getAccount(connection, tokenAccount);
      } catch (error) {
        accountExists = false;
      }

      if (!accountExists) {
        if (data.action === 'freeze') {
          // Create the account first if it doesn't exist and we're trying to freeze
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              tokenAccount,
              targetPubkey, // owner
              mintPubkey // mint
            )
          );
        } else {
          throw new Error('Cannot unfreeze - token account does not exist');
        }
      }

      // Add freeze/unfreeze instruction
      if (data.action === 'freeze') {
        transaction.add(
          createFreezeAccountInstruction(
            tokenAccount,
            mintPubkey,
            publicKey // freeze authority
          )
        );
      } else {
        transaction.add(
          createThawAccountInstruction(
            tokenAccount,
            mintPubkey,
            publicKey // freeze authority
          )
        );
      }

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setFreezeResult(signature);
      
      // Refresh account info
      if (tokenInfo) {
        await fetchAccountInfo(data.tokenAddress, data.targetAddress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${data.action} account`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Watch form values to fetch account info
  const tokenAddress = form.watch('tokenAddress');
  const targetAddress = form.watch('targetAddress');

  // Fetch account info when both addresses are valid
  React.useEffect(() => {
    if (tokenInfo && tokenAddress && targetAddress && targetAddress.length > 32) {
      fetchAccountInfo(tokenAddress, targetAddress);
    }
  }, [tokenInfo, tokenAddress, targetAddress]);

  return (
    <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Freeze/Unfreeze Token Accounts</CardTitle>
          <CardDescription>
            Freeze or unfreeze token accounts for tokens where you control the freeze authority
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!publicKey && (
            <Alert>
              <AlertDescription>
                Please connect your wallet using the button in the top navigation bar to freeze/unfreeze accounts.
              </AlertDescription>
            </Alert>
          )}

          {freezeResult ? (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 gap-2">
                <CardHeader>
                    <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <span className="text-2xl">
                          {form.getValues('action') === 'freeze' ? '❄️' : '☀️'}
                        </span>
                        Account {form.getValues('action') === 'freeze' ? 'Frozen' : 'Unfrozen'} Successfully!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p>
                          The token account has been {form.getValues('action') === 'freeze' ? 'frozen' : 'unfrozen'} successfully! 
                          {form.getValues('action') === 'freeze' 
                            ? ' The account holder can no longer transfer tokens until unfrozen.'
                            : ' The account holder can now transfer tokens normally.'
                          }
                        </p>
                        <div>
                            <p className="text-sm font-medium mb-2">
                                <strong>Transaction Signature:</strong>
                            </p>
                            <div className="p-3 bg-white dark:bg-gray-800 border rounded-lg font-mono text-xs break-all relative group">
                                {freezeResult}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => navigator.clipboard.writeText(freezeResult)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`https://explorer.solana.com/tx/${freezeResult}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank')}
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
                                  const url = `https://solscan.io${solscanNetwork}/tx/${freezeResult}`;
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
                                    setFreezeResult(null);
                                }}
                                className="w-full"
                            >
                                Freeze/Unfreeze More Accounts
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
                              <FreezeSelect
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

                  <Separator text="Freeze Action" bg="bg-card" />

                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="freeze" id="freeze" />
                              <Label htmlFor="freeze" className="flex items-center gap-2 cursor-pointer">
                                <Snowflake className="h-4 w-4 text-blue-500" />
                                Freeze Account (Prevent transfers)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="unfreeze" id="unfreeze" />
                              <Label htmlFor="unfreeze" className="flex items-center gap-2 cursor-pointer">
                                <Sun className="h-4 w-4 text-orange-500" />
                                Unfreeze Account (Allow transfers)
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Wallet Address</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter wallet address to freeze/unfreeze..."
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

                  {accountInfo && tokenInfo && (
                    <div className={`border rounded-lg p-4 space-y-2 ${
                      accountInfo.exists 
                        ? accountInfo.frozen 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <h4 className="font-medium flex items-center gap-2">
                        {accountInfo.exists ? (
                          accountInfo.frozen ? (
                            <>
                              <Snowflake className="h-4 w-4 text-blue-500" />
                              Account Status: Frozen
                            </>
                          ) : (
                            <>
                              <Sun className="h-4 w-4 text-green-500" />
                              Account Status: Active
                            </>
                          )
                        ) : (
                          <>
                            ⚠️ Account Status: Does Not Exist
                          </>
                        )}
                      </h4>
                      <div className="text-sm space-y-1">
                        {accountInfo.exists ? (
                          <>
                            <div><strong>Balance:</strong> {accountInfo.balance} {tokenInfo.symbol || 'tokens'}</div>
                            <div><strong>Frozen:</strong> {accountInfo.frozen ? 'Yes' : 'No'}</div>
                            {accountInfo.frozen && (
                              <div className="text-blue-600 dark:text-blue-400 text-xs">
                                This account cannot transfer tokens until unfrozen
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-yellow-600 dark:text-yellow-400 text-xs">
                            The token account will be created when frozen for the first time
                          </div>
                        )}
                      </div>
                      
                      {/* Action validation feedback */}
                      {form.watch('action') === 'freeze' && accountInfo.exists && accountInfo.frozen && (
                        <div className="text-orange-600 dark:text-orange-400 text-xs bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                          ⚠️ Cannot freeze - account is already frozen
                        </div>
                      )}
                      {form.watch('action') === 'unfreeze' && (!accountInfo.exists || !accountInfo.frozen) && (
                        <div className="text-orange-600 dark:text-orange-400 text-xs bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                          ⚠️ Cannot unfreeze - {accountInfo.exists ? 'account is already unfrozen' : 'account does not exist'}
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !publicKey || 
                      isProcessing || 
                      !tokenInfo || 
                      !accountInfo ||
                      (form.watch('action') === 'freeze' && accountInfo.exists && accountInfo.frozen) ||
                      (form.watch('action') === 'unfreeze' && (!accountInfo.exists || !accountInfo.frozen))
                    }
                  >
                    {isProcessing 
                      ? `${form.watch('action') === 'freeze' ? 'Freezing' : 'Unfreezing'} Account...` 
                      : !accountInfo
                      ? 'Enter target address to continue'
                      : (form.watch('action') === 'freeze' && accountInfo.exists && accountInfo.frozen)
                      ? 'Account is already frozen'
                      : (form.watch('action') === 'unfreeze' && (!accountInfo.exists || !accountInfo.frozen))
                      ? accountInfo.exists ? 'Account is already unfrozen' : 'Account does not exist'
                      : `${form.watch('action') === 'freeze' ? 'Freeze' : 'Unfreeze'} Account`
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