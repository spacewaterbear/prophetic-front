"use client";

import { memo } from "react";
import { useI18n } from "@/contexts/i18n-context";

export interface ImmoPriceFactor {
  label: string;
  description: string;
  delta_per_sqm: number;
  direction: "positive" | "negative";
}

export interface ImmoComparable {
  address: string;
  surface_m2: number;
  floor: number | null;
  dpe_class: string | null;
  price_per_sqm: number;
}

export interface ImmoDisplayData {
  property: {
    address: string;
    neighborhood: string;
    description: string;
  };
  estimation: {
    total_k: number;
    price_per_sqm: number;
    vs_neighborhood_pct: number;
    range_low_k: number;
    range_high_k: number;
  };
  reference_price: {
    price_per_sqm: number;
    description: string;
  };
  price_factors: ImmoPriceFactor[];
  waterfall: {
    reference_per_sqm: number;
    atouts_total: number;
    limites_total: number;
    estimated_per_sqm: number;
  };
  dpe: {
    class: string;
    energy_kwh_per_sqm: number | null;
    co2_kg_per_sqm: number | null;
    thermal_penalty: boolean;
  };
  comparables: {
    items: ImmoComparable[];
    shown: number;
    total: number;
    median_per_sqm: number;
    vs_comps_pct: number;
  };
}

const C = {
  bg: "rgb(251,248,244)",
  card: "rgb(255,255,255)",
  dark: "rgb(31,34,48)",
  mid: "rgb(91,96,114)",
  light: "rgb(154,160,176)",
  border: "rgb(236,232,224)",
  greenBg: "rgb(231,243,236)",
  green: "rgb(46,125,91)",
  redBg: "rgb(251,234,230)",
  red: "rgb(185,74,58)",
  blue: "rgb(61,90,241)",
  blueBg: "rgb(238,241,255)",
};

const DPE_BG: Record<string, string> = {
  A: "rgb(0,163,119)",
  B: "rgb(81,180,107)",
  C: "rgb(155,199,89)",
  D: "rgb(232,196,107)",
  E: "rgb(238,152,56)",
  F: "rgb(224,97,40)",
  G: "rgb(200,50,50)",
};

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

interface Props {
  data: ImmoDisplayData;
}

export const ImmoEstimationCard = memo(function ImmoEstimationCard({ data }: Props) {
  const { t } = useI18n();
  const { property, estimation, reference_price, price_factors, waterfall, dpe, comparables } = data;

  const scale = 76 / waterfall.estimated_per_sqm;
  const refPct = waterfall.reference_per_sqm * scale;
  const atoutPct = waterfall.atouts_total * scale;
  const limitePct = waterfall.limites_total * scale;

  const waterfallRows = [
    {
      label: t("immoCard.referencePrice"),
      value: waterfall.reference_per_sqm,
      color: C.blue,
      barLeft: 0,
      barWidth: refPct,
      bold: false,
      separator: false,
      sign: "",
    },
    {
      label: t("immoCard.strengths"),
      value: waterfall.atouts_total,
      color: C.green,
      barLeft: refPct,
      barWidth: atoutPct,
      bold: false,
      separator: false,
      sign: "+",
    },
    {
      label: t("immoCard.weaknesses"),
      value: waterfall.limites_total,
      color: C.red,
      barLeft: refPct + atoutPct,
      barWidth: limitePct,
      bold: false,
      separator: false,
      sign: "−",
    },
    {
      label: t("immoCard.estimatedPerSqm"),
      value: waterfall.estimated_per_sqm,
      color: C.dark,
      barLeft: 0,
      barWidth: 76,
      bold: true,
      separator: true,
      sign: "",
    },
  ] as const;

  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 20,
        padding: 18,
        fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Property header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: C.light, marginBottom: 3 }}>
          {property.neighborhood}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.dark,
            letterSpacing: -0.5,
          }}
        >
          {property.address}
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>
          {property.description}
        </div>
      </div>

      {/* Estimation — full width */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "20px 16px",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.light,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {t("immoCard.estimation")}
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -2,
            fontVariantNumeric: "tabular-nums",
            color: C.dark,
          }}
        >
          {fmt(estimation.total_k)}{" "}
          <span style={{ fontSize: 20, fontWeight: 500, color: C.mid }}>k€</span>
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 8 }}>
          {t("immoCard.soit")}{" "}
          <span style={{ color: C.dark, fontWeight: 600 }}>
            {fmt(estimation.price_per_sqm)} €/m²
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            padding: "4px 10px",
            background: estimation.vs_neighborhood_pct >= 0 ? C.greenBg : C.redBg,
            color: estimation.vs_neighborhood_pct >= 0 ? C.green : C.red,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {estimation.vs_neighborhood_pct >= 0 ? "↑" : "↓"}{" "}
          {estimation.vs_neighborhood_pct >= 0 ? "+" : ""}
          {estimation.vs_neighborhood_pct} % {t("immoCard.vsNeighborhood")}
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Prix de référence + Ventes comparables */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Reference price */}
          <div
            style={{
              background: C.blueBg,
              border: `1px solid ${C.border}`,
              borderRadius: 13,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                {t("immoCard.referencePrice")}
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: C.dark,
                }}
              >
                {fmt(reference_price.price_per_sqm)} €/m²
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.mid }}>
              {reference_price.description}
            </div>
          </div>

          {/* Comparable sales */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 16,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                {t("immoCard.comparableSales")}
              </div>
              <div style={{ fontSize: 10, color: C.light }}>
                {comparables.shown} / {comparables.total}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 44px 32px 28px 68px",
                fontSize: 10,
                color: C.light,
                paddingBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              <div>{t("immoCard.address")}</div>
              <div style={{ textAlign: "right" }}>{t("immoCard.surface")}</div>
              <div style={{ textAlign: "right" }}>{t("immoCard.floor")}</div>
              <div style={{ textAlign: "center" }}>{t("immoCard.dpe")}</div>
              <div style={{ textAlign: "right" }}>€/m²</div>
            </div>

            {comparables.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 44px 32px 28px 68px",
                  fontSize: 12,
                  padding: "8px 0",
                  borderTop: `1px solid ${C.border}`,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: C.dark,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.address}
                </div>
                <div style={{ textAlign: "right", color: C.mid }}>
                  {item.surface_m2} m²
                </div>
                <div style={{ textAlign: "right", color: C.mid }}>
                  {item.floor !== null && item.floor !== undefined
                    ? `${item.floor}ᵉ`
                    : "—"}
                </div>
                <div style={{ textAlign: "center" }}>
                  {item.dpe_class ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 4px",
                        borderRadius: 3,
                        background: "rgb(244,241,236)",
                        color: C.mid,
                      }}
                    >
                      {item.dpe_class}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div
                  style={{
                    textAlign: "right",
                    color: C.dark,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(item.price_per_sqm)}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 10, fontSize: 11, color: C.light }}>
              {t("immoCard.medianComps")} ·{" "}
              <span style={{ color: C.dark, fontWeight: 600 }}>
                {fmt(comparables.median_per_sqm)} €/m²
              </span>{" "}
              · {t("immoCard.yourPropertyAt")}{" "}
              <span
                style={{
                  color: comparables.vs_comps_pct >= 0 ? C.green : C.red,
                  fontWeight: 600,
                }}
              >
                {comparables.vs_comps_pct >= 0 ? "+" : ""}
                {comparables.vs_comps_pct} %
              </span>
            </div>
          </div>
        </div>

        {/* Right column: DPE + Ce qui change le prix */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* DPE */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                {t("immoCard.energyPerformance")}
              </div>
              <div style={{ fontSize: 10, color: C.light }}>
                {t("immoCard.dpe")} · GES
              </div>
            </div>

            <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
              {["A", "B", "C", "D", "E", "F", "G"].map((cls) => (
                <div
                  key={cls}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 7,
                    background:
                      cls === dpe.class
                        ? DPE_BG[cls] ?? C.border
                        : "rgb(244,241,236)",
                    color: cls === dpe.class ? C.dark : C.light,
                    border: `2px solid ${cls === dpe.class ? C.dark : "transparent"}`,
                  }}
                >
                  {cls}
                </div>
              ))}
            </div>

            {(dpe.energy_kwh_per_sqm !== null ||
              dpe.co2_kg_per_sqm !== null) && (
              <div
                className="grid grid-cols-2 gap-2"
                style={{ marginBottom: 10 }}
              >
                {dpe.energy_kwh_per_sqm !== null && (
                  <div
                    style={{ background: C.bg, borderRadius: 8, padding: 10 }}
                  >
                    <div style={{ fontSize: 11, color: C.light }}>
                      {t("immoCard.energy")}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 2,
                        fontSize: 13,
                        color: C.dark,
                      }}
                    >
                      {dpe.energy_kwh_per_sqm}{" "}
                      <span
                        style={{
                          color: C.light,
                          fontSize: 10,
                          fontWeight: 400,
                        }}
                      >
                        kWh/m²/an
                      </span>
                    </div>
                  </div>
                )}
                {dpe.co2_kg_per_sqm !== null && (
                  <div
                    style={{ background: C.bg, borderRadius: 8, padding: 10 }}
                  >
                    <div style={{ fontSize: 11, color: C.light }}>CO₂</div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginTop: 2,
                        fontSize: 13,
                        color: C.dark,
                      }}
                    >
                      {dpe.co2_kg_per_sqm}{" "}
                      <span
                        style={{
                          color: C.light,
                          fontSize: 10,
                          fontWeight: 400,
                        }}
                      >
                        kg/m²/an
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                padding: "8px 10px",
                background: dpe.thermal_penalty ? C.redBg : C.greenBg,
                borderRadius: 8,
                fontSize: 11,
                color: dpe.thermal_penalty ? C.red : C.green,
              }}
            >
              {dpe.thermal_penalty
                ? t("immoCard.thermalPenalty")
                : t("immoCard.noThermalPenalty")}
            </div>
          </div>

          {/* Price factors */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 16,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 3,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                {t("immoCard.whatChangesPrice")}
              </div>
              <div style={{ fontSize: 11, color: C.light }}>
                {price_factors.length} {t("immoCard.factors")}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.light, marginBottom: 12 }}>
              {t("immoCard.factorsDescription")}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {price_factors.map((factor, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 11,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.dark,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {factor.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.light,
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {factor.description}
                    </div>
                  </div>
                  <div
                    style={{
                      background:
                        factor.direction === "positive" ? C.greenBg : C.redBg,
                      color:
                        factor.direction === "positive" ? C.green : C.red,
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      marginLeft: 6,
                      flexShrink: 0,
                    }}
                  >
                    {factor.direction === "positive" ? "+" : "−"}
                    {fmt(factor.delta_per_sqm)} €
                  </div>
                </div>
              ))}
            </div>

            {/* Waterfall */}
            <div
              style={{
                background: C.bg,
                borderRadius: 11,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: C.light,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                {t("immoCard.waterfallTitle")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {waterfallRows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr 84px",
                      alignItems: "center",
                      gap: 10,
                      paddingTop: row.separator ? 8 : 0,
                      borderTop: row.separator
                        ? `1px solid ${C.border}`
                        : undefined,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: row.bold ? C.dark : C.mid,
                        fontWeight: row.bold ? 600 : 400,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.label}
                    </div>
                    <div style={{ height: 9, position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: `${row.barLeft}%`,
                          top: 0,
                          bottom: 0,
                          width: `${row.barWidth}%`,
                          background: row.color,
                          borderRadius: 4,
                          opacity: row.bold ? 1 : 0.85,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: row.bold ? 13 : 12,
                        color:
                          i === 1
                            ? C.green
                            : i === 2
                              ? C.red
                              : C.dark,
                        fontWeight: row.bold ? 700 : 500,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.sign}
                      {fmt(row.value)} €
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 14,
          fontSize: 10,
          color: C.light,
          textAlign: "center",
        }}
      >
        {t("immoCard.disclaimer")}
      </div>
    </div>
  );
});
