'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from './seperator';

interface UltraCheapTokenFormData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
}

interface UltraCheapBasicDetailsFormProps {
  form: UseFormReturn<UltraCheapTokenFormData>;
}

export function UltraCheapBasicDetailsForm({ form }: UltraCheapBasicDetailsFormProps) {
  return (
    <>
      <Separator text="Basic Details" bg="bg-card" />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., My Ultra Cheap Token" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="symbol"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token Symbol</FormLabel>
            <FormControl>
              <Input placeholder="e.g., UCT" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
} 