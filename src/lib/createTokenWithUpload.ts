import { type Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  AccountLayout,
} from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { createTokenMetadata } from './uploadImage';

export interface CoinFormData {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  supply: number;
  imageFile?: File;
  revokeMintAuthority?: boolean;
  revokeFreezeAuthority?: boolean;
}

// Ultra-cheap token creation interface (minimal fields)
export interface UltraCheapTokenData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
}

// Metaplex Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Service fee configuration (removed to make token creation cheaper)
// const SERVICE_FEE_LAMPORTS = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL
// const SERVICE_FEE_RECIPIENT = new PublicKey('DcDoaF5o1BrfReZ5hUCNB169tdkDRZ3btLM8CvrcJzG7');

export async function createToken(
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: any
  ) => Promise<string>,
  data: CoinFormData
): Promise<{ mintPubkey: PublicKey; imageUrl?: string }> {
  // Generate a new mint keypair
  const mintKeypair = Keypair.generate();

  // Derive the metadata PDA
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  // Fetch rent exemption amount
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);

  // Derive the associated token account address
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    publicKey
  );

  // Create metadata URI using the secure server-side API
  let metadataUri = '';
  let imageUrl: string | undefined = undefined;
  try {
    const result = await createTokenMetadata({
      mintId: mintKeypair.publicKey.toString(), // Use mint public key as ID
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      image: data.imageFile, // Optional image file
    });
    metadataUri = result.metadataUrl;
    imageUrl = result.imageUrl;
    console.log('Token metadata created successfully:', result);
  } catch (error) {
    console.error('Failed to create token metadata:', error);
    throw new Error(`Failed to create token metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Fetch a recent blockhash for the transaction
  const { blockhash } = await connection.getLatestBlockhash();

  // Construct the transaction
  const transaction = new Transaction({
    feePayer: publicKey,
    recentBlockhash: blockhash,
  });

  // 1. Create the mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // 2. Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      data.decimals,
      publicKey,
      publicKey
    )
  );

  // 3. Create the metadata account
  transaction.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: publicKey,
        payer: publicKey,
        updateAuthority: publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: data.name,
            symbol: data.symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  // 4. Create the associated token account
  transaction.add(
    createAssociatedTokenAccountInstruction(
      publicKey,
      associatedTokenAddress,
      publicKey,
      mintKeypair.publicKey
    )
  );

  // 5. Mint tokens to the associated account
  const mintAmount = data.supply * Math.pow(10, data.decimals);
  transaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAddress,
      publicKey,
      mintAmount
    )
  );

  // 6. Revoke authorities if requested
  if (data.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        publicKey,
        AuthorityType.MintTokens,
        null
      )
    );
  }

  if (data.revokeFreezeAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        publicKey,
        AuthorityType.FreezeAccount,
        null
      )
    );
  }

  // 7. Service fee transfer removed to make token creation cheaper

  // Send and confirm the transaction
  const signature = await sendTransaction(transaction, connection, {
    signers: [mintKeypair],
  });
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight: (
      await connection.getLatestBlockhash()
    ).lastValidBlockHeight,
  });

  // Return the new mint public key and image URL
  return { 
    mintPubkey: mintKeypair.publicKey,
    imageUrl 
  };
}

/**
 * Creates an ultra-cheap SPL token with minimal operations
 * Removes: metadata, service fees, image upload, authority revocation
 * Keeps only: mint creation, initialization, associated token account, and minting
 */
export async function createUltraCheapToken(
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: any
  ) => Promise<string>,
  data: UltraCheapTokenData
): Promise<{ mintPubkey: PublicKey }> {
  console.log('Creating ultra-cheap token with data:', data);
  
  // Generate a new mint keypair
  const mintKeypair = Keypair.generate();
  console.log('Generated mint keypair:', mintKeypair.publicKey.toString());

  // Fetch rent exemption amount
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  console.log('Mint rent exemption:', mintRent);

  // Derive the associated token account address
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    publicKey
  );
  console.log('Associated token address:', associatedTokenAddress.toString());

  // Check user balance before proceeding
  const userBalance = await connection.getBalance(publicKey);
  console.log('User balance:', userBalance, 'lamports');

  // Fetch a recent blockhash for the transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  console.log('Using blockhash:', blockhash);

  // Construct the minimal transaction
  const transaction = new Transaction({
    feePayer: publicKey,
    recentBlockhash: blockhash,
  });

  // 1. Create the mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // 2. Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      data.decimals,
      publicKey,
      publicKey
    )
  );

  // 3. Create the associated token account
  transaction.add(
    createAssociatedTokenAccountInstruction(
      publicKey,
      associatedTokenAddress,
      publicKey,
      mintKeypair.publicKey
    )
  );

  // 4. Mint tokens to the associated account
  const mintAmount = data.supply * Math.pow(10, data.decimals);
  console.log('Minting amount:', mintAmount, 'tokens');
  transaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAddress,
      publicKey,
      mintAmount
    )
  );

  console.log('Transaction constructed with', transaction.instructions.length, 'instructions');

  // Send and confirm the transaction
  try {
    const signature = await sendTransaction(transaction, connection, {
      signers: [mintKeypair],
    });
    console.log('Transaction sent with signature:', signature);

    // Confirm the transaction
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('Transaction confirmed successfully');

    // Return only the mint public key
    return { 
      mintPubkey: mintKeypair.publicKey
    };
  } catch (error) {
    console.error('Error in createUltraCheapToken:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds to create token. Please ensure you have enough SOL to cover the transaction fees and rent.');
      } else if (error.message.includes('blockhash not found')) {
        throw new Error('Transaction expired. Please try again.');
      } else if (error.message.includes('User rejected')) {
        throw new Error('Transaction was rejected by user.');
      } else if (error.message.includes('Transaction was not confirmed')) {
        throw new Error('Transaction was not confirmed. Please check the explorer and try again if the token was not created.');
      }
    }
    
    throw error;
  }
}

export async function estimateCreateTokenFee(
  connection: Connection,
  publicKey: PublicKey,
  data: CoinFormData,
): Promise<number> {
  try {
    // Generate a temporary mint keypair for fee estimation
    const mintKeypair = Keypair.generate();
    // Derive the metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Fetch rent exemption amount for a mint
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    // Fetch rent exemption amount for the associated token account
    const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    // Estimate metadata account rent (current size after October 2024 account size reduction)
    // Metadata account now requires 607 bytes (down from 679)
    const metadataAccountRent = await connection.getMinimumBalanceForRentExemption(607);
    // Derive the associated token address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey
    );

    // For fee estimation, we don't need to actually upload anything
    // Just use a placeholder URI since we're only estimating transaction costs
    const metadataUri = 'https://example.com/metadata.json';

    // Fetch a recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    // Construct the transaction identical to createToken
    const transaction = new Transaction({
      feePayer: publicKey,
      recentBlockhash: blockhash,
    });

    // 1. Create the mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    // 2. Initialize the mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        data.decimals,
        publicKey,
        publicKey
      )
    );
    // 3. Create the metadata account
    transaction.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mintKeypair.publicKey,
          mintAuthority: publicKey,
          payer: publicKey,
          updateAuthority: publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: data.name,
              symbol: data.symbol,
              uri: metadataUri,
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );
    // 4. Create the associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey
      )
    );
    // 5. Mint tokens to the associated account
    const mintAmount = data.supply * Math.pow(10, data.decimals);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey,
        mintAmount
      )
    );

    // 6. Revoke authorities if requested (for fee estimation)
    if (data.revokeMintAuthority) {
      transaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    }

    if (data.revokeFreezeAuthority) {
      transaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    // 7. Service fee transfer removed to make token creation cheaper

    // Compile message for fee estimation
    const message = transaction.compileMessage();
    
    // Metaplex protocol fee for creating Token Metadata (0.01 SOL)
    const metaplexProtocolFee = 0.01 * 1000000000; // Convert SOL to lamports
    
    // Log the components for debugging
    console.log('Fee estimation breakdown:');
    console.log('Mint rent:', mintRent);
    console.log('Token account rent:', tokenAccountRent);
    console.log('Metadata account rent:', metadataAccountRent);
    console.log('Metaplex protocol fee:', metaplexProtocolFee);
    console.log('Service fee: REMOVED (0 SOL saved)');
    
    // Use getFeeForMessage if available
    if (typeof (connection as any).getFeeForMessage === 'function') {
      // @ts-ignore
      const { value } = await (connection as any).getFeeForMessage(message);
      console.log('Transaction fee:', value);
      const totalFee = mintRent + tokenAccountRent + metadataAccountRent + metaplexProtocolFee + value;
      console.log('Total estimated fee:', totalFee);
      return totalFee;
    }
    // Fallback to fee calculator per signature
    const feeCalcResp = await connection.getFeeCalculatorForBlockhash(blockhash);
    if (feeCalcResp.value === null) {
      throw new Error('Failed to fetch fee calculator for fee estimation');
    }
    const feeCalculator = feeCalcResp.value;
    const requiredSigs = message.header.numRequiredSignatures;
    const transactionFee = feeCalculator.lamportsPerSignature * requiredSigs;
    console.log('Transaction fee (fallback):', transactionFee);
    const totalFee = mintRent + tokenAccountRent + metadataAccountRent + metaplexProtocolFee + transactionFee;
    console.log('Total estimated fee (fallback):', totalFee);
    return totalFee;
  } catch (error) {
    console.error('Error estimating token creation fee:', error);
    throw error;
  }
}

/**
 * Estimates the fee for creating an ultra-cheap SPL token
 * Only includes essential operations: mint creation, initialization, token account, and minting
 */
export async function estimateUltraCheapTokenFee(
  connection: Connection,
  publicKey: PublicKey,
  data: UltraCheapTokenData,
): Promise<number> {
  try {
    // Generate a temporary mint keypair for fee estimation
    const mintKeypair = Keypair.generate();

    // Fetch rent exemption amounts
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    const tokenAccountRent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

    // Derive the associated token address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey
    );

    // Fetch a recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Construct the minimal transaction
    const transaction = new Transaction({
      feePayer: publicKey,
      recentBlockhash: blockhash,
    });

    // 1. Create the mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize the mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        data.decimals,
        publicKey,
        publicKey
      )
    );

    // 3. Create the associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey
      )
    );

    // 4. Mint tokens to the associated account
    const mintAmount = data.supply * Math.pow(10, data.decimals);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey,
        mintAmount
      )
    );

    // Compile message for fee estimation
    const message = transaction.compileMessage();
    
    // Log the components for debugging
    console.log('Ultra-cheap fee estimation breakdown:');
    console.log('Mint rent:', mintRent);
    console.log('Token account rent:', tokenAccountRent);
    console.log('NO metadata account rent (saved)');
    console.log('NO Metaplex protocol fee (saved)');
    console.log('NO service fee (saved)');
    
    // Use getFeeForMessage if available
    if (typeof (connection as any).getFeeForMessage === 'function') {
      // @ts-ignore
      const { value } = await (connection as any).getFeeForMessage(message);
      console.log('Transaction fee:', value);
      const totalFee = mintRent + tokenAccountRent + value;
      console.log('Total estimated ultra-cheap fee:', totalFee);
      return totalFee;
    }
    
    // Fallback to fee calculator per signature
    const feeCalcResp = await connection.getFeeCalculatorForBlockhash(blockhash);
    if (feeCalcResp.value === null) {
      throw new Error('Failed to fetch fee calculator for fee estimation');
    }
    const feeCalculator = feeCalcResp.value;
    const requiredSigs = message.header.numRequiredSignatures;
    const transactionFee = feeCalculator.lamportsPerSignature * requiredSigs;
    console.log('Transaction fee (fallback):', transactionFee);
    const totalFee = mintRent + tokenAccountRent + transactionFee;
    console.log('Total estimated ultra-cheap fee (fallback):', totalFee);
    return totalFee;
  } catch (error) {
    console.error('Error estimating ultra-cheap token creation fee:', error);
    throw error;
  }
} 