'use client';
import dynamic from 'next/dynamic';

const HomePageClient = dynamic(
  () => import('@/components/HomePageClient'),
  { ssr: false }
);

export default function Page() {
  return <HomePageClient />;
}
