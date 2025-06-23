'use client';
import dynamic from 'next/dynamic';

const MintPageClient = dynamic(
  () => import('@/components/MintPageClient'),
  { ssr: false }
);

export default function MintTokensPage() {
  return <MintPageClient />;
} 