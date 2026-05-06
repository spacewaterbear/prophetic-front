import { isMaintenanceError } from "./error-parsing";

/** All mutable state collected while streaming from the Prophetic API. */
export interface AccumulatedStreamState {
  fullResponse: string;
  structuredData: Record<string, unknown> | null;
  marketplaceData: Record<string, unknown> | null;
  realEstateData: Record<string, unknown> | null;
  vignetteData: Record<string, unknown> | null;
  clothesSearchData: Record<string, unknown> | null;
  jewelrySearchData: Record<string, unknown> | null;
  carsSearchData: Record<string, unknown> | null;
  watchesSearchData: Record<string, unknown> | null;
  whiskySearchData: Record<string, unknown> | null;
  wineSearchData: Record<string, unknown> | null;
  immoDisplayData: Record<string, unknown> | null;
}

export function createAccumulatedState(): AccumulatedStreamState {
  return {
    fullResponse: "",
    structuredData: null,
    marketplaceData: null,
    realEstateData: null,
    vignetteData: null,
    clothesSearchData: null,
    jewelrySearchData: null,
    carsSearchData: null,
    watchesSearchData: null,
    whiskySearchData: null,
    wineSearchData: null,
    immoDisplayData: null,
  };
}

type Enqueue = (chunk: Uint8Array) => void;

function encodeEvent(encoder: TextEncoder, payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function handleTypedEvent(
  type: string,
  parsed: Record<string, unknown>,
  acc: AccumulatedStreamState,
  enqueue: Enqueue,
  encoder: TextEncoder,
): boolean {
  switch (type) {
    case "artist_info":
      acc.structuredData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "artist_info", data: parsed }));
      return true;

    case "metadata":
      enqueue(encodeEvent(encoder, parsed));
      if (
        (parsed as { skip_streaming?: boolean; intro?: string }).skip_streaming
      ) {
        acc.fullResponse +=
          (parsed as { intro?: string }).intro + "\n\n";
      }
      return true;

    case "marketplace_data": {
      let payload = parsed.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload as string);
        } catch {
          /* keep as-is */
        }
      }
      acc.marketplaceData = { ...parsed, data: payload } as Record<
        string,
        unknown
      >;
      enqueue(encodeEvent(encoder, { type: "marketplace_data", data: payload }));
      return true;
    }

    case "real_estate_data":
      acc.realEstateData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "real_estate_data", data: parsed.data }));
      return true;

    case "vignette_data":
      acc.vignetteData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "vignette_data", data: parsed.data }));
      return true;

    case "clothes_data":
      acc.clothesSearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "clothes_data", data: parsed.data }));
      return true;

    case "jewelry_data":
      acc.jewelrySearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "jewelry_data", data: parsed.data }));
      return true;

    case "cars_data":
      acc.carsSearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "cars_data", data: parsed.data }));
      return true;

    case "watches_data":
      acc.watchesSearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "watches_data", data: parsed.data }));
      return true;

    case "whisky_data":
      acc.whiskySearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "whisky_data", data: parsed.data }));
      return true;

    case "wine_data":
      acc.wineSearchData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "wine_data", data: parsed.data }));
      return true;

    case "immo_display_data":
      acc.immoDisplayData = parsed as Record<string, unknown>;
      enqueue(encodeEvent(encoder, { type: "immo_display_data", data: parsed.data }));
      return true;

    case "status":
      enqueue(encodeEvent(encoder, { type: "status", message: parsed.message, favicon_url: parsed.favicon_url }));
      return true;

    case "error":
      enqueue(encodeEvent(encoder, { type: "status", message: "Your brain is being updated, please wait..." }));
      return true;

    default:
      return false;
  }
}

/** Process one fully-parsed SSE event object. Returns false if the event was not recognised. */
export function processEvent(
  parsed: Record<string, unknown>,
  acc: AccumulatedStreamState,
  enqueue: Enqueue,
  encoder: TextEncoder,
): boolean {
  // Typed events
  if (typeof parsed.type === "string" && parsed.type !== "") {
    const handled = handleTypedEvent(
      parsed.type,
      parsed,
      acc,
      enqueue,
      encoder,
    );
    if (handled) return true;
  }

  // Content field handling
  if (parsed.content) {
    const content = parsed.content as string;
    const trimmed = content.trim();

    // Nested SSE in content
    if (trimmed.startsWith("data:")) {
      const nestedJson = trimmed.slice(6).trim();
      try {
        const nested = JSON.parse(nestedJson) as Record<string, unknown>;
        if (typeof nested.type === "string") {
          handleTypedEvent(nested.type, nested, acc, enqueue, encoder);
        }
      } catch {
        /* ignore */
      }
      return true;
    }

    // Standalone JSON in content
    if (trimmed.startsWith("{")) {
      try {
        const standalone = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof standalone.type === "string") {
          handleTypedEvent(standalone.type, standalone, acc, enqueue, encoder);
          return true;
        }
      } catch {
        /* ignore */
      }
      console.log("[SKIP] Ignoring unrecognised standalone JSON in content");
      return true;
    }

    // Maintenance / error
    if (isMaintenanceError(content)) {
      enqueue(
        encodeEvent(encoder, {
          type: "status",
          message: "Your brain is being updated, please wait...",
        }),
      );
      return true;
    }

    // Normal text chunk
    acc.fullResponse += content;
    enqueue(encodeEvent(encoder, { type: "chunk", content }));
    return true;
  }

  // Error field
  if (parsed.error) {
    console.error("[Prophetic API] Error in stream:", parsed.error);
    enqueue(
      encodeEvent(encoder, {
        type: "status",
        message: "Your brain is being updated, please wait...",
      }),
    );
    return true;
  }

  return false;
}

function safeParse(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

type MessageMetadata = Record<string, unknown>;

/** Build the metadata object to persist alongside the AI message. */
export function buildMessageMetadata(
  acc: AccumulatedStreamState,
): MessageMetadata | null {
  let meta: MessageMetadata | null = null;

  if (acc.structuredData?.type) {
    meta = {
      type: acc.structuredData.type,
      structured_data: acc.structuredData,
    };
  }

  if (acc.marketplaceData?.type === "marketplace_data") {
    const payload = acc.marketplaceData.data as Record<string, unknown>;
    const defaultPos =
      meta?.type === "artist_info" ? "after" : "before";
    const pos =
      (acc.marketplaceData.marketplace_position as string | undefined) ||
      (payload?.marketplace_position as string | undefined) ||
      defaultPos;
    if (meta) {
      meta.marketplace_data = payload;
      meta.marketplace_position = pos;
    } else {
      meta = {
        type: "marketplace_data",
        structured_data: acc.marketplaceData,
        marketplace_data: payload,
        marketplace_position: pos,
      };
    }
  }

  const simpleFields: Array<{
    accKey: keyof AccumulatedStreamState;
    expectedType: string;
    metaKey: string;
    dataKey: string;
  }> = [
    {
      accKey: "realEstateData",
      expectedType: "real_estate_data",
      metaKey: "real_estate_data",
      dataKey: "data",
    },
    {
      accKey: "vignetteData",
      expectedType: "vignette_data",
      metaKey: "vignette_data",
      dataKey: "data",
    },
    {
      accKey: "clothesSearchData",
      expectedType: "clothes_data",
      metaKey: "clothes_search_data",
      dataKey: "data",
    },
    {
      accKey: "jewelrySearchData",
      expectedType: "jewelry_data",
      metaKey: "jewelry_search_data",
      dataKey: "data",
    },
    {
      accKey: "carsSearchData",
      expectedType: "cars_data",
      metaKey: "cars_search_data",
      dataKey: "data",
    },
    {
      accKey: "watchesSearchData",
      expectedType: "watches_data",
      metaKey: "watches_search_data",
      dataKey: "data",
    },
    {
      accKey: "whiskySearchData",
      expectedType: "whisky_data",
      metaKey: "whisky_search_data",
      dataKey: "data",
    },
    {
      accKey: "wineSearchData",
      expectedType: "wine_data",
      metaKey: "wine_search_data",
      dataKey: "data",
    },
    {
      accKey: "immoDisplayData",
      expectedType: "immo_display_data",
      metaKey: "immo_display_data",
      dataKey: "data",
    },
  ];

  for (const field of simpleFields) {
    const raw = acc[field.accKey] as Record<string, unknown> | null;
    if (!raw || raw.type !== field.expectedType) continue;

    const parsed = safeParse(raw[field.dataKey]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;

    if (meta) {
      meta[field.metaKey] = parsed;
    } else {
      meta = {
        type: field.expectedType,
        structured_data: raw,
        [field.metaKey]: parsed,
      };
    }
  }

  return meta;
}
