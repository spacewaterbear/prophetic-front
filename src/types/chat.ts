import { VignetteData } from "@/types/vignettes";
import { ClothesSearchData } from "@/components/ClothesSearchCard";

export interface Artist {
  artist_name: string;
  artist_picture_url: string | null;
  primary_country: string | null;
  country_iso_code: string | null;
  total_artworks: number | null;
  ratio_sold?: number;
  social_score?: number;
}

export interface MarketplaceData {
  found: boolean;
  marketplace: string;
  artist_profile?: {
    name: string;
    url: string;
    artwork_count?: number;
  } | null;
  artworks?: Array<{
    title: string;
    price: string;
    url: string;
    image_url?: string;
  }>;
  total_artworks?: number;
  error_message?: string | null;
  search_metadata?: Record<string, unknown>;
}

export interface RealEstateData {
  found: boolean;
  marketplace: string;
  location: string;
  location_slug?: string;
  properties: Array<{
    title: string;
    price: string;
    price_amount: number;
    price_currency: string;
    url: string;
    image_url: string;
    bedrooms?: number;
    bathrooms?: number;
    square_meters?: number;
    square_feet?: number;
    property_type: string;
    listing_id?: string;
  }>;
  total_properties: number;
  search_url?: string;
  filters_applied?: Record<string, unknown>;
  error_message?: string | null;
}

export interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  created_at: string;
  type?: string;
  message?: string;
  research_type?: string;
  artist?: Artist;
  has_existing_data?: boolean;
  text?: string;
  streaming_text?: string;
  marketplace_data?: MarketplaceData;
  marketplace_position?: "before" | "after";
  real_estate_data?: RealEstateData;
  vignette_data?: VignetteData[];
  clothes_search_data?: ClothesSearchData;
  vignetteCategory?: string;
}

export interface PendingMessage {
  content: string;
  flashCards?: string;
  flashCardType?: "flash_invest" | "ranking" | "portfolio" | "PORTFOLIO";
  scrollToTop?: boolean;
}

export interface PendingVignetteStream {
  imageName: string;
  category: string;
  streamType: "sse";
  tier?: string;
}

export interface PendingMarkdownStream {
  type: "independant" | "dependant-without-sub" | "dependant-with-sub";
  params: Record<string, string>;
  options?: { userPrompt?: string; scrollToTop?: boolean };
}

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  ART: "Marché de l'art",
  ART_TRADING_VALUE: "Art Trading Value",
  BIJOUX: "Bijoux Précieux",
  CARDS_US: "Cartes Sportives",
  CARS: "Voitures de Collections",
  CASH_FLOW_LEASING: "Cash-Flow Leasing",
  IMMO_LUXE: "Immobilier de Prestige",
  MONTRES_LUXE: "Montres Iconiques",
  SACS: "Sacs de Luxe",
  SNEAKERS: "Sneakers",
  WHISKY: "Whisky Rares",
  WINE: "Vins Patrimoniaux",
  MARCHE_SPOT: "Marché Spot",
};
