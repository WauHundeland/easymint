'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Snowflake } from 'lucide-react';

interface TokenMint {
  address: string;
  name?: string;
  symbol?: string;
  decimals: number;
  supply: string;
  freezeAuthority: string;
}

interface FreezeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  onTokenSelect?: (token: TokenMint) => void;
  placeholder?: string;
}

export function FreezeSelect({ value, onValueChange, onTokenSelect, placeholder = "Select a token mint..." }: FreezeSelectProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<TokenMint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserMints = async () => {
    if (!publicKey) {
      setTokens([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get all token accounts owned by the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      // Get unique mint addresses where user has tokens
      const mintAddresses = Array.from(new Set(
        tokenAccounts.value.map(account => account.account.data.parsed.info.mint)
      ));

      if (mintAddresses.length === 0) {
        setTokens([]);
        return;
      }

      // ULTRA-EFFICIENT: Batch fetch with chunking to minimize RPC calls
      const mintPubkeys = mintAddresses.map(addr => new PublicKey(addr));
      
      // Process in chunks to respect RPC limits (typically 100 accounts per call)
      const CHUNK_SIZE = 100;
      const chunks = [];
      for (let i = 0; i < mintPubkeys.length; i += CHUNK_SIZE) {
        chunks.push(mintPubkeys.slice(i, i + CHUNK_SIZE));
      }

      // Batch fetch all mint accounts with minimal RPC calls
      const allMintInfos: (any | null)[] = [];
      for (const chunk of chunks) {
        try {
          const chunkInfos = await connection.getMultipleAccountsInfo(chunk);
          allMintInfos.push(...chunkInfos);
        } catch (error) {
          console.error('Error fetching chunk:', error);
          // Fill with nulls for this chunk
          allMintInfos.push(...new Array(chunk.length).fill(null));
        }
      }

      // Process mint infos and filter for user's freeze authority using manual parsing
      const userMints: TokenMint[] = [];
      const metadataPDAs: PublicKey[] = [];
      const validMints: { mintAddress: string; decimals: number; supply: string; index: number }[] = [];

      for (let i = 0; i < allMintInfos.length; i++) {
        const mintInfo = allMintInfos[i];
        const mintAddress = mintAddresses[i];

        if (!mintInfo?.data) continue;
        try {
          // Decode mint account layout using spl-token MintLayout
          const data = mintInfo.data as Buffer;
          // Ensure account data length matches mint layout size
          if (data.length < MintLayout.span) continue;
          const parsedMint = MintLayout.decode(data);
          
          // Filter for tokens where user has the freeze authority
          if (parsedMint.freezeAuthorityOption === 0) continue;
          const freezeAuthority = new PublicKey(parsedMint.freezeAuthority).toString();
          if (freezeAuthority !== publicKey.toString()) continue;

          const decimals = parsedMint.decimals;
          const supplyBN = parsedMint.supply as any;
          const supplyValue = BigInt(supplyBN.toString());

          validMints.push({
            mintAddress,
            decimals,
            supply: (Number(supplyValue) / Math.pow(10, decimals)).toLocaleString(),
            index: i
          });

          // Prepare metadata PDA for batch fetching
          const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              mintPubkeys[i].toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          );
          metadataPDAs.push(metadataPDA);
        } catch (e) {
          console.error(`Error parsing mint ${mintAddress}:`, e);
        }
      }

      // Batch fetch metadata (only for valid mints) with chunking
      let metadataAccounts: (any | null)[] = [];
      if (metadataPDAs.length > 0) {
        try {
          // Process metadata in chunks as well
          const metadataChunks = [];
          for (let i = 0; i < metadataPDAs.length; i += CHUNK_SIZE) {
            metadataChunks.push(metadataPDAs.slice(i, i + CHUNK_SIZE));
          }

          for (const chunk of metadataChunks) {
            try {
              const chunkMetadata = await connection.getMultipleAccountsInfo(chunk);
              metadataAccounts.push(...chunkMetadata);
            } catch (error) {
              console.warn('Failed to fetch metadata chunk:', error);
              metadataAccounts.push(...new Array(chunk.length).fill(null));
            }
          }
        } catch (e) {
          console.warn('Failed to fetch metadata:', e);
          metadataAccounts = new Array(metadataPDAs.length).fill(null);
        }
      }

      // Process results
      for (let i = 0; i < validMints.length; i++) {
        const mint = validMints[i];
        let tokenMetadata: { name?: string; symbol?: string } = {};

        // Parse metadata if available
        const metadataAccount = metadataAccounts[i];
        if (metadataAccount?.data) {
          try {
            const data = metadataAccount.data;
            if (data.length > 100) {
              // Basic metadata parsing
              const nameStart = 69;
              const nameLength = data.readUInt32LE(65);
              if (nameLength > 0 && nameLength < 50) {
                const parsedName = data.slice(nameStart, nameStart + nameLength).toString('utf8').replace(/\0/g, '').trim();
                if (parsedName) tokenMetadata.name = parsedName;
              }
              
              const symbolStart = nameStart + nameLength + 4;
              const symbolLength = data.readUInt32LE(nameStart + nameLength);
              if (symbolLength > 0 && symbolLength < 20) {
                const parsedSymbol = data.slice(symbolStart, symbolStart + symbolLength).toString('utf8').replace(/\0/g, '').trim();
                if (parsedSymbol) tokenMetadata.symbol = parsedSymbol;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        userMints.push({
          address: mint.mintAddress,
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          decimals: mint.decimals,
          supply: mint.supply,
          freezeAuthority: publicKey.toString(),
        });
      }

      setTokens(userMints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token mints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserMints();
  }, [publicKey, connection]);

  const handleValueChange = (selectedValue: string) => {
    onValueChange(selectedValue);
    
    if (onTokenSelect) {
      const selectedToken = tokens.find(token => token.address === selectedValue);
      if (selectedToken) {
        onTokenSelect(selectedToken);
      }
    }
  };

  if (!publicKey) {
    return (
      <Alert>
        <AlertDescription>
          Please connect your wallet to view your token mints.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div>
          <Select value={value} onValueChange={handleValueChange} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading your mints..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {tokens.length === 0 && !loading ? (
                <SelectItem value="no-mints" disabled>
                  No mints found where you have freeze authority
                </SelectItem>
              ) : (
                tokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    <div className="flex flex-col items-start">
                      <div className="font-medium">
                        {token.name || token.symbol || 'Unknown Token'}
                        {token.symbol && token.name && ` (${token.symbol})`}
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={fetchUserMints}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertDescription className="text-red-800 dark:text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {tokens.length === 0 && !loading && !error && (
        <Alert>
          <Snowflake className="h-4 w-4" />
          <AlertDescription>
            No token mints found where you have freeze authority. Only tokens where you control the freeze authority can be used for freezing accounts.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 