export enum Vignettes {
  ART = "ART",
  ART_TRADING_VALUE = "ART_TRADING_VALUE",
  BIJOUX = "BIJOUX",
  CARDS_US = "CARDS_US",
  CARS = "CARS",
  CASH_FLOW_LEASING = "CASH_FLOW_LEASING",
  IMMO_LUXE = "IMMO_LUXE",
  MONTRES_LUXE = "MONTRES_LUXE",
  SACS = "SACS",
  SNEAKERS = "SNEAKERS",
  WHISKY = "WHISKY",
  WINE = "WINE",
}

export interface VignetteData {
  category: Vignettes;
  brand_name: string;
  public_url: string;
  nb_insights: number;
  score?: number;
  trend?: "up" | "down";
  subtitle?: string;
  plan?: "discover" | "intelligence" | "oracle";
  media_type?: "audio" | "image" | "pdf";
  audio_url?: string;
  pdf_url?: string;
  primary_country?: string | null;
}

export interface VignetteResponse {
  vignettes: VignetteData[];
}
