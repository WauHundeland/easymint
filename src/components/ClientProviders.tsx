'use client';

import * as React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { WalletContextProvider } from '@/components/wallet-provider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <WalletContextProvider>
        {children}
      </WalletContextProvider>
    </ThemeProvider>
  );
} 