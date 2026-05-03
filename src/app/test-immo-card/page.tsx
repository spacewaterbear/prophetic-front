"use client";

import { ImmoEstimationCard, ImmoDisplayData } from "@/components/ImmoEstimationCard";

const mockData: ImmoDisplayData = {
  property: {
    address: "5 rue Scipion, 75005 Paris",
    neighborhood: "Paris 75005",
    description: "Appartement · 20.0 m² · 6ᵉ étage",
  },
  estimation: {
    total_k: 280,
    price_per_sqm: 14024,
    vs_neighborhood_pct: 23.1,
    range_low_k: 0,
    range_high_k: 0,
  },
  reference_price: {
    price_per_sqm: 11396,
    description: "Médiane des ventes appartement sur les 12 derniers mois dans le quartier Paris.",
  },
  price_factors: [],
  waterfall: {
    reference_per_sqm: 11396,
    atouts_total: 0,
    limites_total: 0,
    estimated_per_sqm: 14024,
  },
  dpe: {
    class: "G",
    energy_kwh_per_sqm: null,
    co2_kg_per_sqm: null,
    thermal_penalty: true,
  },
  comparables: {
    items: [
      { address: "RUE DE LA GLACIERE", surface_m2: 16, floor: null, dpe_class: null, price_per_sqm: 7188 },
      { address: "AV DES GOBELINS", surface_m2: 16, floor: null, dpe_class: null, price_per_sqm: 19875 },
      { address: "RUE DE QUATREFAGES", surface_m2: 26, floor: null, dpe_class: null, price_per_sqm: 15192 },
      { address: "RUE BROCA", surface_m2: 14, floor: null, dpe_class: null, price_per_sqm: 12857 },
    ],
    shown: 4,
    total: 1054,
    median_per_sqm: 14024,
    vs_comps_pct: 0.0,
  },
};

export default function TestImmoCardPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          ImmoEstimationCard — Test
        </h1>
        <ImmoEstimationCard data={mockData} />
      </div>
    </div>
  );
}
