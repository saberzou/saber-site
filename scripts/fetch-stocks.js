#!/usr/bin/env node
// Fetch AAPL / MSFT / GOOGL and write stocks.json at repo root.
// Primary: Yahoo Finance (gives price + prev close). Fallback: Stooq (price only).
// Runs in GitHub Actions (Node 20+). No npm deps.

const fs = require('fs');
const path = require('path');

const TICKERS = ['AAPL', 'MSFT', 'GOOGL'];
const OUT = path.join(__dirname, '..', 'stocks.json');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function yahooQuote(sym) {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const host = hosts[attempt % hosts.length];
    const url = `https://${host}/v8/finance/chart/${sym}?interval=1d&range=5d`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://finance.yahoo.com/',
        },
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(1500 + attempt * 1500);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error('no meta');
      const price = Number(meta.regularMarketPrice);
      const prev = Number(
        meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose
      );
      const changePct =
        isFinite(price) && isFinite(prev) && prev !== 0
          ? ((price - prev) / prev) * 100
          : null;
      return {
        symbol: sym,
        price: isFinite(price) ? Number(price.toFixed(2)) : null,
        previousClose: isFinite(prev) ? Number(prev.toFixed(2)) : null,
        changePct: changePct != null ? Number(changePct.toFixed(2)) : null,
        currency: meta.currency || 'USD',
        source: 'yahoo',
      };
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  throw lastErr || new Error('yahoo failed');
}

async function stooqBatch(symbols) {
  // Single CSV call for all tickers; gives today's close (no prev close).
  const s = symbols.map((x) => x.toLowerCase() + '.us').join('+');
  const url = `https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcvn&h&e=csv`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`stooq HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).slice(1);
  const out = {};
  for (const line of lines) {
    const cols = line.split(',');
    const sym = (cols[0] || '').replace(/\.US$/i, '').toUpperCase();
    const close = Number(cols[6]);
    if (sym && isFinite(close)) {
      out[sym] = {
        symbol: sym,
        price: Number(close.toFixed(2)),
        previousClose: null,
        changePct: null,
        currency: 'USD',
        source: 'stooq',
      };
    }
  }
  return out;
}

(async () => {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {}
  const merged = { ...(existing.quotes || {}) };

  // Stooq fallback batch upfront (cheap, single request).
  let stooq = {};
  try {
    stooq = await stooqBatch(TICKERS);
  } catch (e) {
    console.error(`stooq batch failed: ${e.message}`);
  }

  for (const sym of TICKERS) {
    try {
      const q = await yahooQuote(sym);
      merged[sym] = q;
      console.log(`ok yahoo ${sym} ${q.price} (${q.changePct}%)`);
    } catch (e) {
      console.error(`yahoo ${sym} failed: ${e.message}`);
      if (stooq[sym]) {
        // Preserve prev-known changePct/prevClose if we had one; refresh price.
        const prevKnown = merged[sym] || {};
        merged[sym] = {
          ...stooq[sym],
          previousClose: prevKnown.previousClose ?? null,
          changePct:
            stooq[sym].price != null && prevKnown.previousClose
              ? Number(
                  (
                    ((stooq[sym].price - prevKnown.previousClose) /
                      prevKnown.previousClose) *
                    100
                  ).toFixed(2)
                )
              : prevKnown.changePct ?? null,
        };
        console.log(`ok stooq ${sym} ${merged[sym].price}`);
      } else {
        console.error(`no fallback for ${sym}, keeping last-known`);
      }
    }
  }

  const out = {
    updatedAt: new Date().toISOString(),
    quotes: merged,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${OUT}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
