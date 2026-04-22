export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-opus-4-7": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-4-5": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
};

const DEFAULT_PRICE: ModelPrice = PRICES["claude-opus-4-7"];

export function priceFor(model: string | undefined): ModelPrice {
  if (!model) return DEFAULT_PRICE;
  return PRICES[model] ?? DEFAULT_PRICE;
}

export function listKnownModels(): string[] {
  return Object.keys(PRICES);
}
