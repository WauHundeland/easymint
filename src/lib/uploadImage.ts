// Client-side upload utilities for secure server-side R2 integration
import { PublicKey } from '@solana/web3.js';

// Validate that mintId is a valid Solana public key
function validateMintId(mintId: string): boolean {
  try {
    new PublicKey(mintId);
    return true;
  } catch {
    return false;
  }
}

// Secure server-side upload to Cloudflare R2 via API endpoint
export async function uploadImageToR2(file: File, mintId: string): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image must be smaller than 10MB');
  }

  // Validate mint ID is a valid Solana public key
  if (!validateMintId(mintId)) {
    throw new Error('Invalid mint ID. Must be a valid Solana public key.');
  }

  console.log('Starting upload to API with mint ID:', mintId);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mintId', mintId);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  console.log('API response status:', response.status);

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`;
    try {
      const errorData = await response.json() as { error?: string };
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    console.error('API error:', errorMessage);
    throw new Error(errorMessage);
  }

  const result = await response.json() as {
    url: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  
  console.log(`Image uploaded successfully: ${result.url}`);
  console.log(`Original size: ${(result.originalSize / 1024).toFixed(2)} KB`);
  console.log(`Compressed size: ${(result.compressedSize / 1024).toFixed(2)} KB`);
  console.log(`Compression ratio: ${result.compressionRatio}% reduction`);
  
  return result.url;
}

// Upload metadata to R2 via secure API
async function uploadMetadataToR2(metadata: object, mintId: string): Promise<string> {
  // Validate mint ID is a valid Solana public key
  if (!validateMintId(mintId)) {
    throw new Error('Invalid mint ID. Must be a valid Solana public key.');
  }

  const response = await fetch('/api/upload', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata, mintId }),
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || 'Metadata upload failed');
  }

  const result = await response.json() as { url: string };
  return result.url;
}

// Server-side token metadata creation
export async function createTokenMetadata(tokenData: {
  mintId: string;
  name: string;
  symbol: string;
  description: string;
  image?: File;
}) {
  console.log('Creating token metadata for:', {
    mintId: tokenData.mintId,
    name: tokenData.name,
    symbol: tokenData.symbol,
    hasImage: !!tokenData.image
  });

  try {
    // Create form data with all token information
    const formData = new FormData();
    formData.append('mintId', tokenData.mintId);
    formData.append('name', tokenData.name);
    formData.append('symbol', tokenData.symbol);
    formData.append('description', tokenData.description);
    
    if (tokenData.image) {
      formData.append('image', tokenData.image);
    }

    // Send everything to the server in one secure request
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json() as {
      success: boolean;
      error?: string;
      metadataUrl: string;
      imageUrl?: string;
      compressionStats?: any;
      metadata: any;
    };
    
    if (!result.success) {
      throw new Error(result.error || 'Token metadata creation failed');
    }

    console.log('Token metadata created successfully:', {
      metadataUrl: result.metadataUrl,
      imageUrl: result.imageUrl,
      compressionStats: result.compressionStats
    });

    return {
      metadataUrl: result.metadataUrl,
      imageUrl: result.imageUrl,
      compressionStats: result.compressionStats,
      metadata: result.metadata
    };

  } catch (error) {
    console.error('Token metadata creation error:', error);
    throw error;
  }
} 