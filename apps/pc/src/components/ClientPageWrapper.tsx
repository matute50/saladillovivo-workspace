"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { PageData } from "@/lib/types"; // Asumiendo que PageData se define en types.ts

const DynamicHomePageClient = dynamic(() => import("@/components/HomePageClient"), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-black" /> // Placeholder mientras carga
});

interface ClientPageWrapperProps {
  initialData: PageData;
}

const ClientPageWrapper: React.FC<ClientPageWrapperProps> = ({ initialData }) => {
  return <DynamicHomePageClient initialData={initialData} />;
};

export default ClientPageWrapper;
