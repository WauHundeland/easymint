import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// AWS SDK imports for local development
let S3Client: any, PutObjectCommand: any;
let awsClient: any = null;

// Dynamic import AWS SDK only in development/local environment
const initAWSClient = async () => {
  // Use AWS SDK only in local development (not in Cloudflare Pages/Workers)
  const isLocal = process.env.NODE_ENV === 'development' && !process.env.CF_PAGES;
  
  if (isLocal) {
    try {
      const { S3Client: S3, PutObjectCommand: PutCmd } = await import('@aws-sdk/client-s3');
      S3Client = S3;
      PutObjectCommand = PutCmd;
      
      awsClient = new S3Client({
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
        region: 'auto',
      });
      console.log('Using AWS SDK for local development');
      return true;
    } catch (error) {
      console.warn('AWS SDK not available, falling back to R2 bindings');
      return false;
    }
  }
  
  console.log('Running in production, using native R2 bindings');
  return false;
};

// Get R2 bucket from Cloudflare bindings (production)
declare global {
  interface CloudflareEnv {
    R2_BUCKET: R2Bucket;
  }
}

// Validate environment variables
const requiredEnvVars = {
  bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
};

// Additional env vars for local development
const localEnvVars = {
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

// Validate mintId is a valid Solana public key
function validateMintId(mintId: string): boolean {
  try {
    // Must be a valid Solana public key
    const publicKey = new PublicKey(mintId);
    
    // Additional security checks
    const mintIdString = publicKey.toString();
    
    // Ensure it's exactly what solana spec expects (base58 string, correct length)
    if (mintIdString !== mintId) {
      console.error('Mint ID normalization mismatch:', { original: mintId, normalized: mintIdString });
      return false;
    }
    
    // Ensure no bad chars
    if (mintId.includes('/') || mintId.includes('\\') || mintId.includes('..') || mintId.includes('.')) {
      console.error('Mint ID contains invalid path characters:', mintId);
      return false;
    }
    
    // Solana public keys should be 32 bytes encoded in base58 
    if (mintId.length < 32 || mintId.length > 44) {
      console.error('Mint ID has invalid length:', mintId.length);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Mint ID validation failed:', error);
    return false;
  }
}

// Validate token metadata fields
function validateTokenData(data: {
  name: string;
  symbol: string;
  description: string;
}) {
  const errors: string[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else if (data.name.length > 512) {
    errors.push('Name must be 512 characters or less');
  }

  // Validate symbol
  if (!data.symbol || typeof data.symbol !== 'string') {
    errors.push('Symbol is required');
  } else if (data.symbol.length > 512) {
    errors.push('Symbol must be 512 characters or less');
  }

  // Validate description (optional)
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 512) {
    errors.push('Description must be 512 characters or less');
  }

  return errors;
}

// Simple image processing using Web APIs that work in Cloudflare Workers
async function processImage(arrayBuffer: ArrayBuffer, originalType: string): Promise<{ buffer: Uint8Array; contentType: string; stats: any }> {
  try {
    // For Cloudflare Workers, we'll keep the original image format and just validate size
    // Advanced compression would require additional libraries that may not work in Workers
    
    const originalSize = arrayBuffer.byteLength;
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // If the image is already small enough, use it as-is
    if (originalSize <= 500 * 1024) { // 500KB
      return {
        buffer: uint8Array,
        contentType: originalType,
        stats: {
          originalSize,
          processedSize: originalSize,
          compressionRatio: 0
        }
      };
    }
    
    // For larger images in Cloudflare Workers, we'll use the original but with WebP content type if supported
    const contentType = originalType.includes('webp') ? 'image/webp' : originalType;
    
    return {
      buffer: uint8Array,
      contentType,
      stats: {
        originalSize,
        processedSize: uint8Array.length,
        compressionRatio: 0
      }
    };
  } catch (error) {
    console.warn('Image processing failed, using original:', error);
    const uint8Array = new Uint8Array(arrayBuffer);
    return {
      buffer: uint8Array,
      contentType: originalType,
      stats: {
        originalSize: arrayBuffer.byteLength,
        processedSize: uint8Array.length,
        compressionRatio: 0
      }
    };
  }
}

// Upload to R2 using appropriate method (AWS SDK or native bindings)
async function uploadToR2(
  fileName: string,
  buffer: Uint8Array,
  contentType: string,
  r2Bucket?: any,
  useAWS: boolean = false
) {
  if (useAWS && awsClient && PutObjectCommand) {
    console.log('Using AWS SDK for local development');
    // Use AWS SDK for local development
    const command = new PutObjectCommand({
      Bucket: requiredEnvVars.bucketName!,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
      CacheControl: 'public, max-age=31536000',
    });
    
    await awsClient.send(command);
  } else if (r2Bucket) {
    console.log('Using native R2 bindings for production');
    // Use native R2 bindings for production
    await r2Bucket.put(fileName, buffer, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });
  } else {
    throw new Error('No R2 client available');
  }
}

// Single endpoint to handle complete token metadata creation
export async function POST(request: NextRequest) {
  console.log('Token metadata creation API called');
  
  // Initialize AWS client for local development
  const useAWS = await initAWSClient();
  
  // Get R2 bucket from Cloudflare bindings (production)
  // Use getCloudflareContext() to access bindings in OpenNext.js
  let r2Bucket = null;
  
  try {
    // Get Cloudflare context and access R2 bucket binding
    const context = getCloudflareContext();
    r2Bucket = context.env.R2_BUCKET;
    console.log('Using R2 bucket from getCloudflareContext().env.R2_BUCKET');
  } catch (error) {
    console.log('Error accessing R2 bucket through getCloudflareContext:', error);
    
    // Fallback for local development
    if ((process.env as any).R2_BUCKET) {
      r2Bucket = (process.env as any).R2_BUCKET;
      console.log('Using R2 bucket from process.env.R2_BUCKET (local fallback)');
    }
  }
  
  console.log('R2 bucket available:', !!r2Bucket);
  
  // Check if we have either AWS client or R2 bucket
  if (!useAWS && !r2Bucket) {
    console.error('Neither AWS client nor R2 bucket available. Missing configuration.');
    const missingLocalVars = Object.entries(localEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
      
    return NextResponse.json(
      { 
        error: `R2 not configured. Missing: ${[...missingEnvVars, ...missingLocalVars].join(', ')}. Check your environment variables or wrangler.jsonc file.` 
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    
    // Extract all required fields
    const mintId = formData.get('mintId') as string;
    const name = formData.get('name') as string;
    const symbol = formData.get('symbol') as string;
    const description = (formData.get('description') as string) || '';
    const imageFile = formData.get('image') as File | null;
    
    console.log('Creating token metadata for:', { mintId, name, symbol, hasImage: !!imageFile, usingAWS: useAWS });
    
    // Validate mint ID
    if (!mintId) {
      return NextResponse.json({ error: 'Mint ID is required' }, { status: 400 });
    }
    
    if (!validateMintId(mintId)) {
      console.error('Invalid mint ID provided:', mintId);
      return NextResponse.json({ error: 'Invalid mint ID. Must be a valid Solana public key.' }, { status: 400 });
    }

    // Validate token data
    const validationErrors = validateTokenData({ name, symbol, description });
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    let imageUrl = '';
    let compressionStats = null;

    // Handle image upload if provided
    if (imageFile) {
      console.log('Processing image:', imageFile.name, `${(imageFile.size / 1024).toFixed(2)} KB`, imageFile.type);
      
      // Validate image file
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
      }

      // Validate file size (max 1MB)
      if (imageFile.size > 1 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be smaller than 1MB' }, { status: 400 });
      }

      // Process and upload image using Web APIs
      const arrayBuffer = await imageFile.arrayBuffer();
      
      console.log(`Original image size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

      // Process the image (simplified for Cloudflare Workers compatibility)
      const processed = await processImage(arrayBuffer, imageFile.type);
      
      compressionStats = processed.stats;
      
      console.log(`Processed image size: ${(processed.buffer.length / 1024).toFixed(2)} KB`);
      if (processed.stats.compressionRatio > 0) {
        console.log(`Compression ratio: ${processed.stats.compressionRatio}% reduction`);
      }

      // Upload image to R2
      const fileExtension = processed.contentType.includes('webp') ? 'webp' : 
                           processed.contentType.includes('png') ? 'png' : 
                           processed.contentType.includes('jpeg') ? 'jpg' : 'img';
      const imageFileName = `tokens/${mintId}/image.${fileExtension}`;
      console.log('Uploading image to R2:', imageFileName);

      await uploadToR2(imageFileName, processed.buffer, processed.contentType, r2Bucket, useAWS);

      imageUrl = `${requiredEnvVars.publicUrl}/${imageFileName}`;
      console.log(`Image uploaded successfully: ${imageUrl}`);
    }

    // Create metadata object (server-controlled, no client manipulation)
    const metadata = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      description: description.trim(),
      image: imageUrl,
      external_url: '',
      attributes: [],
      properties: {
        files: imageUrl ? [{
          uri: imageUrl,
          type: imageUrl.includes('.webp') ? 'image/webp' : 
                imageUrl.includes('.png') ? 'image/png' : 
                imageUrl.includes('.jpg') ? 'image/jpeg' : 'image/jpeg'
        }] : [],
        category: 'image',
      }
    };

    // Upload metadata to R2
    const metadataFileName = `tokens/${mintId}/metadata.json`;
    const metadataString = JSON.stringify(metadata, null, 2);
    const metadataBuffer = new TextEncoder().encode(metadataString);

    console.log('Uploading metadata to R2:', metadataFileName);

    await uploadToR2(metadataFileName, metadataBuffer, 'application/json', r2Bucket, useAWS);

    const metadataUrl = `${requiredEnvVars.publicUrl}/${metadataFileName}`;
    console.log(`Metadata uploaded successfully: ${metadataUrl}`);
    
    // Return comprehensive response
    return NextResponse.json({
      success: true,
      metadataUrl,
      imageUrl: imageUrl || null,
      compressionStats,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
      }
    });

  } catch (error) {
    console.error('Token metadata creation error:', error);
    return NextResponse.json(
      { error: `Failed to create token metadata: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 