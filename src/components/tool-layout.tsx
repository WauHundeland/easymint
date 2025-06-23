'use client';

import React from 'react';
import { Navigation } from './navigation';

interface ToolLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
                {title}
              </h1>
              {description && (
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {description}
                </p>
              )}
            </div>
            
            {children}
          </div>
        </div>
      </main>
    </div>
  );
} 