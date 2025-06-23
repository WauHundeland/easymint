'use client';

import { ToolLayout } from '@/components/tool-layout';
import { FreezeTokensClient } from '@/components/freeze-tokens-client';

export default function FreezePageClient() {
  return (
    <ToolLayout
      title="Freeze Tokens"
    >
      <FreezeTokensClient />
    </ToolLayout>
  );
} 