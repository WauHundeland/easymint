import * as z from 'zod';

export const coinSchema = z.object({
  creationType: z.enum(['token', 'nft'], {
    required_error: 'Please select what you want to create',
  }),
  name: z.string().min(1, 'Token name is required').max(512, 'Token name must be 512 characters or less'),
  symbol: z.string().min(1, 'Token symbol is required').max(512, 'Token symbol must be 512 characters or less'),
  description: z.string().max(512, 'Description must be 512 characters or less'),
  decimals: z.number().min(0).max(9),
  supply: z.number().min(1, 'Initial supply must be at least 1').max(2**64 - 1, 'Initial supply must be less than 2^64 - 1'),
  imageFile: z.any().optional().refine((file) => {
    if (!file) return true; // Optional file
    return (file as File).size <= 1 * 1024 * 1024; // Max 1MB
  }, 'Image must be smaller than 1MB'),
  revokeMintAuthority: z.boolean().default(false),
  revokeFreezeAuthority: z.boolean().default(false),
}).refine((data) => {
  // Require image for NFTs
  if (data.creationType === 'nft' && !data.imageFile) {
    return false;
  }
  return true;
}, {
  message: 'Image is required for NFTs',
  path: ['imageFile'],
});

export type CoinFormData = z.infer<typeof coinSchema>; 