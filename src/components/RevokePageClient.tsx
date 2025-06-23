'use client';

import { ToolLayout } from '@/components/tool-layout';
import { RevokeAuthoritiesClient } from '@/components/revoke-authorities-client';

export default function RevokePageClient() {
  return (
    <ToolLayout
      title="Revoke Authorities"
      description="Permanently revoke mint and freeze authorities to make your tokens immutable"
    >
      <RevokeAuthoritiesClient />
    </ToolLayout>
  );
} 