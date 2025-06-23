'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { WalletButton } from './wallet-button';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-2xl font-bold">
              Easy<span className="text-purple-500">Mint</span>
            </Link>
            
            <div className="hidden sm:flex space-x-2">
              <Button
                variant={pathname === '/' ? 'default' : 'ghost'}
                asChild
                size="sm"
              >
                <Link href="/">Create Token</Link>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant={pathname === '/tools' ? 'default' : 'outline'}
              asChild
              size="sm"
              className="hidden sm:flex"
            >
              <Link href="/tools">All Tools</Link>
            </Button>
            <WalletButton />
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="sm:hidden mt-4 flex space-x-2">
          <Button
            variant={pathname === '/' ? 'default' : 'ghost'}
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href="/">Create Token</Link>
          </Button>
          
          <Button
            variant={pathname === '/mint' ? 'default' : 'ghost'}
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href="/mint">Mint Tokens</Link>
          </Button>

          <Button
            variant={pathname === '/freeze' ? 'default' : 'ghost'}
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href="/freeze">Freeze Tokens</Link>
          </Button>

          <Button
            variant={pathname === '/revoke' ? 'default' : 'ghost'}
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href="/revoke">Revoke Authorities</Link>
          </Button>

          <Button
            variant={pathname === '/burn' ? 'default' : 'ghost'}
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href="/burn">Burn Tokens</Link>
          </Button>
        </div>
        
        {/* All Tools Link for Mobile */}
        <div className="sm:hidden mt-2">
          <Button
            variant={pathname === '/tools' ? 'default' : 'outline'}
            asChild
            size="sm"
            className="w-full"
          >
            <Link href="/tools">📋 View All Tools</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
} 