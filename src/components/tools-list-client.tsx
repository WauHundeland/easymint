'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Coins, 
  Plus, 
  Snowflake, 
  ShieldOff, 
  Flame, 
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';

interface Tool {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  href: string;
  category: 'creation' | 'management' | 'advanced';
  isNew?: boolean;
}

const tools: Tool[] = [
  {
    id: 'create',
    title: 'Create Token',
    description: 'Create new SPL tokens with metadata',
    longDescription: 'Launch your own SPL token on Solana with custom metadata, supply, decimals, and authority settings. Perfect for creating new cryptocurrencies, utility tokens, or NFT collections.',
    icon: <Plus className="h-6 w-6" />,
    href: '/',
    category: 'creation',
  },
  {
    id: 'ultra-cheap',
    title: 'Ultra Cheap Creator',
    description: 'Create tokens with minimal cost',
    longDescription: 'Create SPL tokens as cheaply as possible by removing all non-essential operations like metadata, service fees, and image uploads. Perfect for testing or when you need the absolute lowest cost.',
    icon: <Zap className="h-6 w-6" />,
    href: '/ultra-cheap',
    category: 'creation',
    isNew: true,
  },
  {
    id: 'mint',
    title: 'Mint Tokens',
    description: 'Mint additional tokens to any address',
    longDescription: 'Add more tokens to the circulating supply by minting to any wallet address. Only works for tokens where you control the mint authority.',
    icon: <Coins className="h-6 w-6" />,
    href: '/mint',
    category: 'management',
  },
  {
    id: 'freeze',
    title: 'Freeze Tokens',
    description: 'Freeze/unfreeze token accounts',
    longDescription: 'Control token transferability by freezing or unfreezing specific token accounts. Useful for compliance, security, or managing token distribution.',
    icon: <Snowflake className="h-6 w-6" />,
    href: '/freeze',
    category: 'management',
  },
  {
    id: 'revoke',
    title: 'Revoke Authorities',
    description: 'Permanently revoke mint/freeze authorities',
    longDescription: 'Make your tokens immutable by permanently revoking mint and freeze authorities. This increases trust by ensuring no future changes to token rules.',
    icon: <ShieldOff className="h-6 w-6" />,
    href: '/revoke',
    category: 'advanced',
  },
  {
    id: 'burn',
    title: 'Burn Tokens',
    description: 'Permanently destroy tokens',
    longDescription: 'Reduce total supply by permanently burning tokens from your wallet. This deflationary action can increase scarcity and potentially boost token value.',
    icon: <Flame className="h-6 w-6" />,
    href: '/burn',
    category: 'advanced',
    isNew: true,
  },
];

const categoryInfo = {
  creation: {
    title: 'Token Creation',
    description: 'Launch new tokens and assets',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
  management: {
    title: 'Token Management',
    description: 'Manage existing tokens',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
  },
  advanced: {
    title: 'Advanced Operations',
    description: 'Permanent and irreversible actions',
    color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-800 dark:text-orange-200',
  },
};

export function ToolsListClient() {
  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            EasyMint Tools
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Complete toolkit for creating and managing SPL tokens on Solana. 
          From launching new tokens to advanced operations like burning and authority management.
        </p>
      </div>

      {/* Tools by Category */}
      {Object.entries(groupedTools).map(([category, categoryTools]) => {
        const info = categoryInfo[category as keyof typeof categoryInfo];
        
        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className={`rounded-lg p-4 ${info.color}`}>
              <h2 className={`text-2xl font-bold ${info.textColor} mb-2`}>
                {info.title}
              </h2>
              <p className={`${info.textColor} opacity-80`}>
                {info.description}
              </p>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTools.map((tool) => (
                <Card key={tool.id} className="relative group hover:shadow-lg transition-all duration-200">
                  {tool.isNew && (
                    <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                      NEW
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-muted/50">
                        {tool.icon}
                      </div>
                      <CardTitle className="text-xl">{tool.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tool.longDescription}
                    </p>
                    
                    <Button asChild className="w-full group/button">
                      <Link href={tool.href}>
                        <span>Open Tool</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Call to Action */}
      <div className="text-center space-y-4 py-8">
        <h3 className="text-2xl font-bold">Ready to Get Started?</h3>
        <p className="text-muted-foreground mb-6">
          Choose a tool above or start with creating your first token
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="group">
            <Link href="/">
              <Plus className="h-5 w-5" />
              Create Your First Token
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="group">
            <Link href="/ultra-cheap">
              <Zap className="h-5 w-5" />
              Ultra Cheap Creator
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/mint">
              <Coins className="h-5 w-5" />
              Mint Existing Tokens
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 