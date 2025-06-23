'use client';

import React from 'react';
import { ToolLayout } from './tool-layout';
import { CoinCreator } from './coin-creator';

export default function HomePageClient() {
  return (
    <ToolLayout
      title="Create Your Token"
      description="Create your own cryptocurrency token on the Solana blockchain in minutes. No coding required - just fill out the form and deploy!"
    >
      <CoinCreator />
    </ToolLayout>
  );
} 