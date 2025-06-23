'use client';

import React from 'react';
import { UltraCheapTokenCreator } from './ultra-cheap-token-creator';
import { ToolLayout } from './tool-layout';

export default function UltraCheapPageClient() {
  return (
    <ToolLayout
      title="Ultra Cheap Token Creator"
      description="Create SPL tokens with minimal cost by removing all non-essential features. Perfect for testing, airdrops, or when you need a basic token without metadata."
    >
      <div className="space-y-6">
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">What is an Ultra Cheap Token?</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Ultra cheap tokens are SPL tokens created with only the essential operations needed to function. 
            This dramatically reduces the cost compared to regular tokens with metadata.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">✓ What's Included:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Mint account creation</li>
                <li>• Token initialization</li>
                <li>• Associated token account</li>
                <li>• Initial token minting</li>
                <li>• Full SPL token functionality</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-1">✗ What's Removed:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Metadata (name, symbol, image)</li>
                <li>• Metaplex protocol fees</li>
                <li>• Image upload and storage</li>
                <li>• Automatic authority revocation</li>
              </ul>
            </div>
          </div>
        </div>
        
        <UltraCheapTokenCreator />
      </div>
    </ToolLayout>
  );
} 