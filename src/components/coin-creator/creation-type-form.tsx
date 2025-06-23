'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '../seperator';
import { CoinFormData } from './types';

interface CreationTypeFormProps {
  form: UseFormReturn<CoinFormData>;
}

export function CreationTypeForm({ form }: CreationTypeFormProps) {
  const creationType = form.watch('creationType');

  const handleCreationTypeChange = (value: 'token' | 'nft') => {
    form.setValue('creationType', value);
    
    if (value === 'nft') {
      form.setValue('decimals', 0);
      form.setValue('supply', 1);
    } else {
      form.setValue('decimals', 9);
      form.setValue('supply', 1_000_000_000); // 1 billion (common token supply)
    }
  };

  return (
    <>
      <Separator text="What do you want to create?" bg="bg-card" />
      
      <FormField
        control={form.control}
        name="creationType"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormControl>
              <RadioGroup
                onValueChange={handleCreationTypeChange}
                value={field.value}
                className="grid grid-cols-2 gap-4"
              >
                <FormLabel
                  htmlFor="token"
                  className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    creationType === 'token' 
                      ? 'bg-accent/50 border-primary' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <RadioGroupItem value="token" id="token" className="hidden" />
                  <div className="grid gap-1.5 leading-none">
                    <div className="text-sm font-medium leading-none">
                      Token
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a fungible token with custom supply and decimals
                    </p>
                  </div>
                </FormLabel>
                
                <FormLabel
                  htmlFor="nft"
                  className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    creationType === 'nft' 
                      ? 'bg-accent/50 border-primary' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <RadioGroupItem value="nft" id="nft" className="hidden" />
                  <div className="grid gap-1.5 leading-none">
                    <div className="text-sm font-medium leading-none">
                      Collectible (NFT)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create a non-fungible token that is limited to one holder
                    </p>
                  </div>
                </FormLabel>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
} 