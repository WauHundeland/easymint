'use client';
import dynamic from 'next/dynamic';

const ToolsPageClient = dynamic(
  () => import('@/components/ToolsPageClient'),
  { ssr: false }
);

export default function ToolsPage() {
  return <ToolsPageClient />;
} 