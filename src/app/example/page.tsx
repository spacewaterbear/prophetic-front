"use client";

import {
  PriceDistributionChart,
  ValueProjectionChart,
  PortfolioAllocationChart,
  ScoreBreakdownChart,
} from "@/components/ArtistDashboard";

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Artist Dashboard Charts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <PriceDistributionChart />
        <ValueProjectionChart />
        <PortfolioAllocationChart />
        <ScoreBreakdownChart />
      </div>
    </div>
  );
}
