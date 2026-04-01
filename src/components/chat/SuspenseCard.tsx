"use client";

import { Suspense, type ReactNode } from "react";

interface SuspenseCardProps {
  children: ReactNode;
  fallbackText?: string;
}

export function SuspenseCard({ children, fallbackText = "Loading..." }: SuspenseCardProps) {
  return (
    <Suspense fallback={<div className="text-base text-gray-400">{fallbackText}</div>}>
      {children}
    </Suspense>
  );
}
