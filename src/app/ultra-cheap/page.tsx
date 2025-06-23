'use client';
import dynamic from 'next/dynamic';

const UltraCheapPageClient = dynamic(
  () => import('@/components/UltraCheapPageClient'),
  { ssr: false }
);

export default function UltraCheapPage() {
  return <UltraCheapPageClient />;
}