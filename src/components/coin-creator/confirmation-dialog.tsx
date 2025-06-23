'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CoinFormData } from './types';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  formData: CoinFormData | null;
  network: WalletAdapterNetwork;
  estimatedFee: number | null;
  solUsdRate: number | null;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  formData,
  network,
  estimatedFee,
  solUsdRate,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Token Creation</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>Please review your token details carefully. Once created, these properties cannot be changed.</div>

              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><strong>Name:</strong> {formData?.name}</div>
                <div><strong>Symbol:</strong> {formData?.symbol}</div>
                <div><strong>Initial Supply:</strong> {formData?.supply?.toLocaleString()}</div>
                <div><strong>Decimals:</strong> {formData?.decimals}</div>
                {formData?.description && (
                  <div><strong>Description:</strong> {formData.description}</div>
                )}
                {formData?.imageFile && (
                  <div><strong>Icon:</strong> {(formData.imageFile as File).name} uploaded</div>
                )}
                
                {/* Authority Settings */}
                {(formData?.revokeMintAuthority || formData?.revokeFreezeAuthority) && (
                  <div className="pt-2 border-t border-border">
                    <div className="font-medium mb-1">Authority Settings:</div>
                    {formData.revokeMintAuthority && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span>✓</span> Mint Authority will be revoked (fixed supply)
                      </div>
                    )}
                    {formData.revokeFreezeAuthority && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span>✓</span> Freeze Authority will be revoked (always transferable)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {network === WalletAdapterNetwork.Mainnet && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Mainnet Warning:</strong> You are about to create a token on the Solana mainnet.
                    This action cannot be undone and will cost real SOL.
                  </div>
                </div>
              )}

              <div className="text-sm">
                Estimated cost: {estimatedFee && `${(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`}
                {solUsdRate && estimatedFee && ` (≈ $${((estimatedFee / LAMPORTS_PER_SOL) * solUsdRate).toFixed(2)} USD)`}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Create Token</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 