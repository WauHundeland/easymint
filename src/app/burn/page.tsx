'use client';
import dynamic from 'next/dynamic';

const BurnPageClient = dynamic(
  () => import('@/components/BurnPageClient'),
  { ssr: false }
);

export default function BurnPage() {
  return <BurnPageClient />;
} 