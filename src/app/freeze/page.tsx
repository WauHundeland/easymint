'use client';
import dynamic from 'next/dynamic';

const FreezePageClient = dynamic(
  () => import('@/components/FreezePageClient'),
  { ssr: false }
);

export default function FreezePage() {
  return <FreezePageClient />;
} 