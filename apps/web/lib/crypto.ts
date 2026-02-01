/**
 * CoinGecko API utilities for fetching live cryptocurrency data
 * Free tier: No API key required, 10-30 calls/minute
 */

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * Map of common crypto symbols/names to CoinGecko IDs
 */
const COIN_ID_MAP: Record<string, string> = {
  // By symbol
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  ada: "cardano",
  xrp: "ripple",
  doge: "dogecoin",
  dot: "polkadot",
  matic: "matic-network",
  link: "chainlink",
  avax: "avalanche-2",
  bnb: "binancecoin",
  ltc: "litecoin",
  // By name (lowercase)
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  solana: "solana",
  cardano: "cardano",
  ripple: "ripple",
  dogecoin: "dogecoin",
  polkadot: "polkadot",
  polygon: "matic-network",
  chainlink: "chainlink",
  avalanche: "avalanche-2",
  binance: "binancecoin",
  litecoin: "litecoin",
};

/**
 * Crypto price data from CoinGecko
 */
export interface CryptoPrice {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

/**
 * Historical price point for charts
 */
export interface PriceHistoryPoint {
  label: string;
  value: number;
}

/**
 * Enriched crypto data for LLM context
 */
export interface CryptoData {
  coins: CryptoPrice[];
  priceHistory?: {
    coinId: string;
    coinName: string;
    days: number;
    data: PriceHistoryPoint[];
  };
}

/**
 * Fetch current price data for one or more coins
 */
export async function fetchCryptoPrice(
  coinIds: string[],
): Promise<CryptoPrice[]> {
  const ids = coinIds.join(",");
  const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return data.map(
      (coin: {
        id: string;
        name: string;
        symbol: string;
        current_price: number;
        price_change_24h: number;
        price_change_percentage_24h: number;
        market_cap: number;
        total_volume: number;
        high_24h: number;
        low_24h: number;
      }) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        currentPrice: coin.current_price,
        priceChange24h: coin.price_change_24h,
        priceChangePercent24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
      }),
    );
  } catch (error) {
    console.error("Failed to fetch crypto prices:", error);
    return [];
  }
}

/**
 * Fetch historical price data for charts
 */
export async function fetchCryptoHistory(
  coinId: string,
  days: number = 7,
): Promise<PriceHistoryPoint[]> {
  const url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const prices: [number, number][] = data.prices;

    // Sample down to reasonable number of points for chart display
    const maxPoints = 10;
    const step = Math.max(1, Math.floor(prices.length / maxPoints));

    return prices
      .filter((_, index) => index % step === 0)
      .slice(0, maxPoints)
      .map(([timestamp, price]) => {
        const date = new Date(timestamp);
        const label =
          days <= 1
            ? date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
        return {
          label,
          value: Math.round(price * 100) / 100,
        };
      });
  } catch (error) {
    console.error("Failed to fetch crypto history:", error);
    return [];
  }
}

/**
 * Detect crypto-related intent from a prompt
 * Returns detected coin IDs and whether historical data is requested
 */
export function detectCryptoIntent(prompt: string): {
  coinIds: string[];
  wantsHistory: boolean;
  historyDays: number;
} | null {
  const lowerPrompt = prompt.toLowerCase();

  // Check for crypto-related keywords
  const cryptoKeywords = [
    "crypto",
    "coin",
    "price",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "sol",
    "market",
    "trading",
    "currency",
    "token",
  ];

  const hasCryptoIntent = cryptoKeywords.some((keyword) =>
    lowerPrompt.includes(keyword),
  );

  if (!hasCryptoIntent) {
    return null;
  }

  // Extract coin IDs from prompt
  const coinIds: string[] = [];
  for (const [key, value] of Object.entries(COIN_ID_MAP)) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(lowerPrompt) && !coinIds.includes(value)) {
      coinIds.push(value);
    }
  }

  // Default to bitcoin if crypto intent but no specific coin mentioned
  if (coinIds.length === 0) {
    coinIds.push("bitcoin");
  }

  // Check for history/chart requests
  const historyKeywords = [
    "chart",
    "graph",
    "history",
    "trend",
    "over time",
    "past",
  ];
  const wantsHistory = historyKeywords.some((keyword) =>
    lowerPrompt.includes(keyword),
  );

  // Detect time period
  let historyDays = 7; // Default
  if (
    lowerPrompt.includes("24h") ||
    lowerPrompt.includes("1 day") ||
    lowerPrompt.includes("today")
  ) {
    historyDays = 1;
  } else if (lowerPrompt.includes("7 day") || lowerPrompt.includes("week")) {
    historyDays = 7;
  } else if (lowerPrompt.includes("30 day") || lowerPrompt.includes("month")) {
    historyDays = 30;
  } else if (
    lowerPrompt.includes("90 day") ||
    lowerPrompt.includes("3 month")
  ) {
    historyDays = 90;
  }

  return {
    coinIds,
    wantsHistory,
    historyDays,
  };
}

/**
 * Enrich a prompt with live crypto data if relevant
 * Returns null if the prompt doesn't appear crypto-related
 */
export async function enrichPromptWithCryptoData(
  prompt: string,
): Promise<CryptoData | null> {
  const intent = detectCryptoIntent(prompt);

  if (!intent) {
    return null;
  }

  const { coinIds, wantsHistory, historyDays } = intent;

  // Fetch current prices for all detected coins
  const coins = await fetchCryptoPrice(coinIds);

  if (coins.length === 0) {
    return null;
  }

  const result: CryptoData = { coins };

  // Fetch history for the first coin if requested
  if (wantsHistory && coinIds[0]) {
    const historyData = await fetchCryptoHistory(coinIds[0], historyDays);
    if (historyData.length > 0) {
      result.priceHistory = {
        coinId: coinIds[0],
        coinName: coins[0]?.name ?? coinIds[0],
        days: historyDays,
        data: historyData,
      };
    }
  }

  return result;
}

/**
 * Format crypto data as a string for inclusion in prompts
 */
export function formatCryptoDataForPrompt(data: CryptoData): string {
  const lines: string[] = ["LIVE CRYPTO DATA:"];

  for (const coin of data.coins) {
    const changeSign = coin.priceChangePercent24h >= 0 ? "+" : "";
    lines.push(
      `${coin.name} (${coin.symbol}): $${coin.currentPrice.toLocaleString()} | 24h: ${changeSign}${coin.priceChangePercent24h.toFixed(2)}% | Market Cap: $${(coin.marketCap / 1e9).toFixed(2)}B`,
    );
  }

  if (data.priceHistory) {
    lines.push("");
    lines.push(
      `PRICE HISTORY (${data.priceHistory.coinName}, ${data.priceHistory.days} days):`,
    );
    lines.push("Use this data array for LineGraph component:");
    lines.push(JSON.stringify(data.priceHistory.data));
  }

  return lines.join("\n");
}
