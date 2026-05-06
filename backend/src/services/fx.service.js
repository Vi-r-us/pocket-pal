import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { FXRate } from "../models/index.js";

const FRANKFURTER_BASE = "https://api.frankfurter.dev";
const DEFAULT_SOURCE = "frankfurter";

/**
 * Fetch rate from Frankfurter API for a given date.
 * @param {string} fromCurrency - Base currency (e.g. USD)
 * @param {string} toCurrency - Target currency (e.g. INR)
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<{ rate: number, date: string }>}
 */
async function fetchFromFrankfurter(fromCurrency, toCurrency, date) {
  const url = `${FRANKFURTER_BASE}/v1/${date}?base=${fromCurrency}&symbols=${toCurrency}`;
  logger.info({ url }, "Frankfurter API request");

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, url, body: text }, "Frankfurter API error");
    throw new ApiError(502, `FX rate unavailable: ${res.status} ${text || res.statusText}`);
  }

  const data = await res.json();
  const rate = data?.rates?.[toCurrency];
  if (rate == null || typeof rate !== "number") {
    throw new ApiError(502, "Invalid FX rate response");
  }
  return { rate, date: data.date || date };
}

/**
 * Get or create an identity rate row (same currency -> same currency, rate 1).
 * Reuses one canonical identity row across dates to avoid unnecessary duplication.
 * @param {string} currency
 * @param {string} asOfDate - YYYY-MM-DD
 * @returns {Promise<FXRate>}
 */
async function getOrCreateIdentityRate(currency, asOfDate) {
  const existing = await FXRate.findOne({
    where: {
      base_currency: currency,
      target_currency: currency,
    },
    order: [["as_of_date", "ASC"]],
  });
  if (existing) return existing;

  const [row] = await FXRate.findOrCreate({
    where: {
      base_currency: currency,
      target_currency: currency,
      as_of_date: asOfDate || "1970-01-01",
    },
    defaults: {
      rate: 1,
      source: "identity",
    },
  });
  return row;
}

/**
 * Get FX rate (from -> to) for the given date. Uses DB as cache; on miss, fetches from Frankfurter and stores.
 * Returns the FXRate row so caller can use fx_rate_id, rate, as_of_date, source.
 *
 * @param {string} fromCurrency - Transaction currency (e.g. USD)
 * @param {string} toCurrency - Base currency (e.g. INR)
 * @param {string} asOfDate - Date for the rate, YYYY-MM-DD
 * @returns {Promise<FXRate>} FXRate instance with fx_rate_id, rate, as_of_date, source
 */
async function getOrFetchRate(fromCurrency, toCurrency, asOfDate) {
  const from = fromCurrency?.toUpperCase?.() || fromCurrency;
  const to = toCurrency?.toUpperCase?.() || toCurrency;

  if (!from || !to || !asOfDate) {
    throw new ApiError(400, "fromCurrency, toCurrency, and asOfDate are required");
  }

  try {
    if (from === to) {
      return getOrCreateIdentityRate(from, asOfDate);
    }

    let row = await FXRate.findOne({
      where: {
        base_currency: from,
        target_currency: to,
        as_of_date: asOfDate,
      },
    });

    if (row) {
      logger.info({ fx_rate_id: row.fx_rate_id, from, to, asOfDate }, "FX rate cache hit");
      return row;
    }

    const { rate, date } = await fetchFromFrankfurter(from, to, asOfDate);
    row = await FXRate.create({
      base_currency: from,
      target_currency: to,
      as_of_date: date,
      rate,
      source: DEFAULT_SOURCE,
    });
    logger.info({ fx_rate_id: row.fx_rate_id, from, to, date, rate }, "FX rate cached");
    return row;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error getting FX rate", 500);
  }
}

export { getOrFetchRate, getOrCreateIdentityRate };
