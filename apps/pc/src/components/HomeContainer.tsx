'use client'; // Importante

import dynamic from 'next/dynamic';

const DynamicHomePageClient = dynamic(() => import("@/components/HomePageClient"), {  
  ssr: false,
  loading: () => <div className="min-h-screen bg-black" />
});

export default function HomeContainer() {
  return <DynamicHomePageClient />;
}