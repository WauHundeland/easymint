'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={cycleTheme}
    >
      {theme === 'light' && (
        <>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" /> Light
        </>
      )}
      {theme === 'dark' && (
        <>
          <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" /> Dark
        </>
      )}
      {theme === 'system' && (
        <>
          <Monitor className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" /> System
        </>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 