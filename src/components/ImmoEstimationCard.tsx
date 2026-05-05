"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/contexts/i18n-context";

const ImmoMap = dynamic(
  () => import("./ImmoMap").then((m) => m.ImmoMap),
  { ssr: false, loading: () => <div style={{ height: 180 }} /> }
);

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
  location?: {
    lat: number;
    lon: number;
    label: string;
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
  const { property, estimation, reference_price, price_factors, waterfall, dpe, comparables, location } = data;

  // signedPct: -15 to +15 (signed), active: included in price calculation
  type EditableFactor = ImmoPriceFactor & { signedPct: number; initialSignedPct: number; active: boolean };
  const [editableFactors, setEditableFactors] = useState<EditableFactor[]>(
    () => price_factors.map(f => {
      const mag = reference_price.price_per_sqm > 0
        ? Math.round((Math.abs(f.delta_per_sqm) / reference_price.price_per_sqm) * 1000) / 10
        : 0;
      const raw = f.direction === "positive" ? mag : -mag;
      const clamped = Math.max(-15, Math.min(15, raw));
      return {
        ...f,
        signedPct: clamped,
        initialSignedPct: clamped,
        active: true,
      };
    })
  );
  const [selectedDpeClass, setSelectedDpeClass] = useState(dpe.class);

  // Derive surface from original estimate so we can recompute total_k
  const surfaceM2 = estimation.price_per_sqm > 0
    ? estimation.total_k * 1000 / estimation.price_per_sqm
    : 0;

  // Dynamic calculation — only active factors, derive €/m² from signed pct
  const ref = reference_price.price_per_sqm;
  const dynAtouts = editableFactors
    .filter(f => f.active && f.signedPct > 0)
    .reduce((s, f) => s + (f.signedPct / 100) * ref, 0);
  const dynLimites = editableFactors
    .filter(f => f.active && f.signedPct < 0)
    .reduce((s, f) => s + (-f.signedPct / 100) * ref, 0);
  const dynEstimatedPerSqm = Math.round(waterfall.reference_per_sqm + dynAtouts - dynLimites);
  const dynTotalK = surfaceM2 > 0
    ? Math.round(dynEstimatedPerSqm * surfaceM2 / 1000)
    : estimation.total_k;
  const dynVsPct =
    reference_price.price_per_sqm > 0
      ? Math.round(
          ((dynEstimatedPerSqm - reference_price.price_per_sqm) /
            reference_price.price_per_sqm) *
            1000,
        ) / 10
      : estimation.vs_neighborhood_pct;

  const dynThermalPenalty = selectedDpeClass === "F" || selectedDpeClass === "G";

  // Waterfall bars — scale anchored to reference price (fixed), estimated varies
  const FIXED_REF_PCT = 60;
  const scale = waterfall.reference_per_sqm > 0 ? FIXED_REF_PCT / waterfall.reference_per_sqm : 1;
  const refPct = FIXED_REF_PCT;
  const atoutPct = dynAtouts * scale;
  const limitePct = dynLimites * scale;
  const estimatedPct = dynEstimatedPerSqm * scale;

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
      value: dynAtouts,
      color: C.green,
      barLeft: refPct,
      barWidth: atoutPct,
      bold: false,
      separator: false,
      sign: "+",
    },
    {
      label: t("immoCard.weaknesses"),
      value: dynLimites,
      color: C.red,
      barLeft: refPct + atoutPct - limitePct,
      barWidth: limitePct,
      bold: false,
      separator: false,
      sign: "−",
    },
    {
      label: t("immoCard.estimatedPerSqm"),
      value: dynEstimatedPerSqm,
      color: C.dark,
      barLeft: 0,
      barWidth: estimatedPct,
      bold: true,
      separator: true,
      sign: "",
    },
  ];

  const handleFactorSlider = (index: number, value: number) => {
    setEditableFactors(prev =>
      prev.map((f, i) => (i === index ? { ...f, signedPct: value } : f))
    );
  };

  const handleFactorToggle = (index: number) => {
    setEditableFactors(prev =>
      prev.map((f, i) => (i === index ? { ...f, active: !f.active } : f))
    );
  };

  const handleDpeChange = (cls: string) => {
    setSelectedDpeClass(cls);
    const goodClasses = ["A", "B", "C"];
    const badClasses = ["F", "G"];
    setEditableFactors(prev =>
      prev.map(f => {
        if (!f.label.toLowerCase().includes("dpe")) return f;
        const updatedLabel = f.label.replace(/\b[A-G]\b/, cls);
        if (goodClasses.includes(cls) && f.initialSignedPct < 0)
          return { ...f, label: updatedLabel, signedPct: 0 };
        if (badClasses.includes(cls) && f.initialSignedPct < 0)
          return { ...f, label: updatedLabel, signedPct: f.initialSignedPct };
        return { ...f, label: updatedLabel };
      })
    );
  };

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

      {/* Estimation — full width, dynamic */}
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
          {fmt(dynTotalK)}{" "}
          <span style={{ fontSize: 20, fontWeight: 500, color: C.mid }}>k€</span>
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 8 }}>
          {t("immoCard.soit")}{" "}
          <span style={{ color: C.dark, fontWeight: 600 }}>
            {fmt(dynEstimatedPerSqm)} €/m²
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            padding: "4px 10px",
            background: dynVsPct >= 0 ? C.greenBg : C.redBg,
            color: dynVsPct >= 0 ? C.green : C.red,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {dynVsPct >= 0 ? "↑" : "↓"}{" "}
          {dynVsPct >= 0 ? "+" : ""}
          {dynVsPct} % {t("immoCard.vsNeighborhood")}
        </div>
      </div>

      {/* Map */}
      {location && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px 10px",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
              {t("immoCard.locationMap")}
            </div>
            <div style={{ fontSize: 11, color: C.light, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location.label}
            </div>
          </div>
          <ImmoMap lat={location.lat} lon={location.lon} label={location.label} />
        </div>
      )}

      {/* Single column */}
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

          {/* DPE — clickable classes */}
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
                  onClick={() => handleDpeChange(cls)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 7,
                    cursor: "pointer",
                    background:
                      cls === selectedDpeClass
                        ? DPE_BG[cls] ?? C.border
                        : "rgb(244,241,236)",
                    color: cls === selectedDpeClass ? C.dark : C.light,
                    border: `2px solid ${cls === selectedDpeClass ? C.dark : "transparent"}`,
                    transition: "background 0.15s, border-color 0.15s",
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
                background: dynThermalPenalty ? C.redBg : C.greenBg,
                borderRadius: 8,
                fontSize: 11,
                color: dynThermalPenalty ? C.red : C.green,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {dynThermalPenalty
                ? t("immoCard.thermalPenalty")
                : t("immoCard.noThermalPenalty")}
            </div>
          </div>

          {/* Price factors — editable deltas */}
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
                {editableFactors.length} {t("immoCard.factors")}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.light, marginBottom: 12 }}>
              {t("immoCard.factorsDescription")}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {editableFactors.map((factor, i) => {
                const sp = factor.signedPct;
                const pos = ((sp + 15) / 30) * 100;
                const fillColor = sp >= 0 ? C.green : C.red;
                const fillLeft = sp >= 0 ? 50 : pos;
                const fillWidth = sp >= 0 ? pos - 50 : 50 - pos;
                const badgeBg = !factor.active ? C.border : sp >= 0 ? C.greenBg : C.redBg;
                const badgeColor = !factor.active ? C.light : sp >= 0 ? C.green : C.red;

                return (
                  <div
                    key={i}
                    style={{
                      background: factor.active ? C.bg : "rgb(244,244,246)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 11,
                      padding: "10px 12px",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Top row: checkbox + label + badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={factor.active}
                        onChange={() => handleFactorToggle(i)}
                        style={{ cursor: "pointer", width: 14, height: 14, flexShrink: 0, accentColor: C.dark } as React.CSSProperties}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: factor.active ? C.dark : C.light,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            transition: "color 0.15s",
                          }}
                        >
                          {factor.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: C.light,
                            marginTop: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {factor.description}
                        </div>
                      </div>
                      {/* Badge */}
                      <div
                        style={{
                          background: badgeBg,
                          color: badgeColor,
                          padding: "3px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                          minWidth: 44,
                          textAlign: "center",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {sp >= 0 ? "+" : "−"}{Math.abs(sp)}%
                      </div>
                    </div>

                    {/* Slider */}
                    <div style={{ paddingLeft: 22, marginTop: 8 }}>
                      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                        {/* Track */}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            height: 4,
                            borderRadius: 999,
                            background: C.border,
                            overflow: "hidden",
                          }}
                        >
                          {/* Directional fill */}
                          {factor.active && fillWidth > 0 && (
                            <div
                              style={{
                                position: "absolute",
                                left: `${fillLeft}%`,
                                width: `${fillWidth}%`,
                                top: 0,
                                bottom: 0,
                                background: fillColor,
                                opacity: 0.7,
                              }}
                            />
                          )}
                          {/* Center tick */}
                          <div
                            style={{
                              position: "absolute",
                              left: "calc(50% - 1px)",
                              top: 0,
                              bottom: 0,
                              width: 2,
                              background: factor.active ? C.mid : C.border,
                              opacity: 0.4,
                            }}
                          />
                        </div>
                        {/* Thumb */}
                        <div
                          style={{
                            position: "absolute",
                            left: `calc(${pos}% - 7px)`,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: factor.active ? C.card : "rgb(230,229,232)",
                            border: `2px solid ${factor.active ? fillColor : C.light}`,
                            boxShadow: factor.active ? "0 1px 3px rgba(0,0,0,0.18)" : "none",
                            pointerEvents: "none",
                            transition: "border-color 0.1s",
                          }}
                        />
                        {/* Native range — invisible, handles interaction */}
                        <input
                          type="range"
                          min={-15}
                          max={15}
                          step={0.1}
                          value={sp}
                          disabled={!factor.active}
                          onChange={(e) => handleFactorSlider(i, Number(e.target.value))}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            width: "100%",
                            opacity: 0,
                            cursor: factor.active ? "pointer" : "not-allowed",
                            height: 20,
                            margin: 0,
                          } as React.CSSProperties}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          color: C.light,
                          marginTop: 2,
                        }}
                      >
                        <span>−15%</span>
                        <span>0</span>
                        <span>+15%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Waterfall — live */}
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
                {surfaceM2 > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr 84px",
                      alignItems: "center",
                      gap: 10,
                      paddingTop: 8,
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: C.mid, fontWeight: 400 }}>
                      {t("immoCard.totalPrice")}
                    </div>
                    <div />
                    <div
                      style={{
                        fontSize: 13,
                        color: C.dark,
                        fontWeight: 700,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(dynTotalK * 1000)} €
                    </div>
                  </div>
                )}
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
