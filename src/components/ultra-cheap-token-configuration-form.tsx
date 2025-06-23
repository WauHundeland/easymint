'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from './seperator';
import { ShieldOff } from 'lucide-react';

interface UltraCheapTokenFormData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
}

interface UltraCheapTokenConfigurationFormProps {
  form: UseFormReturn<UltraCheapTokenFormData>;
}

export function UltraCheapTokenConfigurationForm({ form }: UltraCheapTokenConfigurationFormProps) {
  return (
    <>
      <Separator text="Token Configuration" bg="bg-card" />

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

        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <ShieldOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Authority Settings:</strong> To keep costs minimal, authority revocation is not available in ultra-cheap mode. 
            You will retain both mint and freeze authorities. You can revoke them later using the "Revoke Authorities" tool if needed.
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
} 