"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  lat: number;
  lon: number;
  label: string;
  height?: number;
}

export function ImmoMap({ lat, lon, label, height = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [lon, lat],
      zoom: 15,
      interactive: false,
      attributionControl: false,
    });

    new maplibregl.Marker({ color: "#3D5AF1" })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 25 }).setText(label))
      .addTo(map);

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    return () => map.remove();
  }, [lat, lon, label]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
