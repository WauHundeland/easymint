'use client';

import { ToolLayout } from '@/components/tool-layout';
import { BurnTokensClient } from '@/components/burn-tokens-client';

export default function BurnPageClient() {
  return (
    <ToolLayout
      title="Burn Tokens"
      description="Permanently destroy tokens to reduce total supply and increase scarcity"
    >
      <BurnTokensClient />
    </ToolLayout>
  );
} 