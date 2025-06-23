'use client';
import dynamic from 'next/dynamic';

const RevokePageClient = dynamic(
  () => import('@/components/RevokePageClient'),
  { ssr: false }
);

export default function RevokePage() {
  return <RevokePageClient />;
} 