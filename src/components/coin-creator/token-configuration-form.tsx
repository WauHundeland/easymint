'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '../seperator';
import { CoinFormData } from './types';

interface TokenConfigurationFormProps {
  form: UseFormReturn<CoinFormData>;
}

export function TokenConfigurationForm({ form }: TokenConfigurationFormProps) {
  const creationType = form.watch('creationType');
  const isNFT = creationType === 'nft';

  return (
    <>
      <Separator text="Token Configuration" bg="bg-card" />

      {isNFT ? (
        <div className="text-center py-4 text-muted-foreground">
          Collectibles cannot be configured
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="decimals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decimals</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="9"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Supply</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <Separator text="Authority Settings" bg="bg-card" />
            
            <FormField
              control={form.control}
              name="revokeMintAuthority"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Revoke Mint Authority (Recommended)
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Permanently disable the ability to mint more tokens
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revokeFreezeAuthority"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Revoke Freeze Authority (Recommended)
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Permanently disable the ability to freeze token accounts
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
            <h5 className="text-sm font-medium text-foreground">Why Revoke Authorities?</h5>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Mint Authority:</strong> Revoking prevents creating additional tokens, ensuring a fixed supply that builds trust with holders.
              </p>
              <p>
                <strong>Freeze Authority:</strong> Revoking prevents freezing individual token accounts, ensuring tokens remain transferable.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}