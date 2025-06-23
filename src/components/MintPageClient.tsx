'use client';

import React from 'react';
import { ToolLayout } from './tool-layout';
import { MintTokensClient } from './mint-tokens-client';

export default function MintPageClient() {
  return (
    <ToolLayout
      title="Mint Tokens"
    >
      <MintTokensClient />
    </ToolLayout>
  );
} 