'use client';

import { ToolsListClient } from '@/components/tools-list-client';
import { Navigation } from '@/components/navigation';

export default function ToolsPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <div className="container mx-auto py-8">
          <div className="max-w-6xl mx-auto p-6">
            <ToolsListClient />
          </div>
        </div>
      </main>
    </div>
  );
} 