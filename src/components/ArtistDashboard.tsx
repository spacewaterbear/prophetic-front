"use client"; // <--- THIS IS THE KEY CHANGE FOR NEXT.JS

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// --- GRAPH 1: Price Distribution (Bar Chart) ---
const priceData = [
  { series: "Sketchbook (Ceramic)", min: 12000, max: 15000 },
  { series: "Animal Instinct", min: 8000, max: 10000 },
  { series: "Love Story (Mixed)", min: 4500, max: 6500 },
  { series: "Entry Level (Vases)", min: 2500, max: 4000 },
  { series: "Prints/Editions", min: 650, max: 2000 },
];

const priceConfig = {
  min: { label: "Min Estimate ($)", color: "hsl(var(--chart-1))" },
  max: { label: "Max Estimate ($)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function PriceDistributionChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Market Price Distribution</CardTitle>
        <CardDescription>Estimated market value range by series (USD)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={priceConfig}>
          <BarChart accessibilityLayer data={priceData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="series" type="category" tickLine={false} tickMargin={10} axisLine={false} width={120} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="min" fill="var(--color-min)" radius={[0, 0, 0, 0]} stackId="a" />
            <Bar dataKey="max" fill="var(--color-max)" radius={[0, 4, 4, 0]} stackId="a" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- GRAPH 2: Value Projection (Line Chart) ---
const projectionData = [
  { year: "2024", value: 10000 },
  { year: "2025", value: 11500 },
  { year: "2026", value: 13800 },
  { year: "2027", value: 16500 },
  { year: "2028", value: 19800 },
];

const projectionConfig = {
  value: { label: "Avg. Portfolio Value ($)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function ValueProjectionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3-Year Value Projection</CardTitle>
        <CardDescription>Estimated growth trajectory (CAGR +15%)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={projectionConfig}>
          <LineChart accessibilityLayer data={projectionData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} dot={{ fill: "var(--color-value)" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- GRAPH 3: Allocation (Donut Chart) ---
const allocationData = [
  { segment: "Premium Sculpture", value: 45, fill: "hsl(var(--chart-1))" },
  { segment: "Mid-Range Painting", value: 35, fill: "hsl(var(--chart-2))" },
  { segment: "Liquidity (Prints)", value: 20, fill: "hsl(var(--chart-3))" },
];

const allocationConfig = {
  value: { label: "Allocation %" },
  "Premium Sculpture": { label: "Premium Sculpture", color: "hsl(var(--chart-1))" },
  "Mid-Range Painting": { label: "Mid-Range Painting", color: "hsl(var(--chart-2))" },
  "Liquidity (Prints)": { label: "Liquidity (Prints)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export function PortfolioAllocationChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Portfolio Allocation</CardTitle>
        <CardDescription>Recommended "Purist" Weighting</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={allocationConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={allocationData} dataKey="value" nameKey="segment" innerRadius={60} strokeWidth={5} />
            <ChartLegend content={<ChartLegendContent nameKey="segment" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- GRAPH 4: Prophetic Score (Radar Chart) ---
const scoreData = [
  { metric: "Rarity", score: 85 },
  { metric: "Global Demand", score: 65 },
  { metric: "Institutional Quality", score: 80 },
  { metric: "Liquidity", score: 55 },
  { metric: "Resilience", score: 75 },
];

const scoreConfig = {
  score: { label: "Prophetic Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function ScoreBreakdownChart() {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Prophetic Score: 72/100</CardTitle>
        <CardDescription>Asset Strength Analysis</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer config={scoreConfig} className="mx-auto aspect-square max-h-[250px]">
          <RadarChart data={scoreData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.6} dot={{ r: 4, fillOpacity: 1 }} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}