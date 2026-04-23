import pricingJson from "./pricing.json" with { type: "json" };

export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface PricingFile {
  defaultModel: string;
  models: Record<string, ModelPrice>;
}

const PRICING = pricingJson as PricingFile;
const PRICES: Record<string, ModelPrice> = PRICING.models;
const DEFAULT_PRICE: ModelPrice =
  PRICES[PRICING.defaultModel] ?? Object.values(PRICES)[0];

export function priceFor(model: string | undefined): ModelPrice {
  if (!model) return DEFAULT_PRICE;
  return PRICES[model] ?? DEFAULT_PRICE;
}

export function listKnownModels(): string[] {
  return Object.keys(PRICES);
}
