# Market Module Testing Checklist

## Goal
Verify the Market module remains functional under normal conditions and when CoinGecko rate limits or fails.

## Backend Endpoint Smoke Tests

- [ ] `GET /api/market/overview` returns `200` with `global`, `coins`, `trending`, and `movers` keys.
- [ ] `GET /api/market/prices?ids=bitcoin,ethereum` returns cached price data.
- [ ] `GET /api/market/trending` returns a non-empty fallback payload when CoinGecko is unavailable.
- [ ] `GET /api/market/search?q=bitcoin` returns search results or fallback data.
- [ ] `GET /api/market/coin/:id` returns coin details or fallback coin data.
- [ ] `GET /api/market/coin/:id/chart?days=7` returns chart points or fallback chart data.
- [ ] `GET /api/market/movers?limit=10` returns gainers and losers.
- [ ] `GET /api/market/sentiment` returns market intelligence without throwing on CoinGecko failure.
- [ ] `GET /api/market/events` returns recent market events.
- [ ] `GET /api/market/snapshots` returns recent snapshots.
- [ ] `GET /api/market/snapshot/latest` returns the latest snapshot or `null`.
- [ ] `GET /api/market/watchlist` returns the authenticated user watchlist.
- [ ] `POST /api/market/watchlist` adds or updates a watchlist coin.
- [ ] `DELETE /api/market/watchlist/:coinId` removes a watchlist coin.
- [ ] `DELETE /api/market/watchlist` clears the watchlist.

## CoinGecko Failure Handling

- [ ] Force CoinGecko to return `429` and confirm backend logs a clean warning with the endpoint name.
- [ ] Force CoinGecko to timeout and confirm fallback market data is returned.
- [ ] Confirm repeated calls within the cache window do not create duplicate CoinGecko requests.
- [ ] Confirm cache invalidation still works after adding/removing watchlist coins and after market/portfolio updates.

## Frontend UI Checks

- [ ] Market page shows skeletons while the initial market payload is loading.
- [ ] Market page does not render blank chart, trending, watchlist, or alert sections when API data is empty or delayed.
- [ ] Market chart shows a visible fallback card when chart data is unavailable.
- [ ] Trending strip shows a fallback message when trending data is unavailable.
- [ ] Market table shows a loading skeleton and a non-empty empty state message.
- [ ] Market sentiment panel still renders explanatory text and empty-state content.
- [ ] Watchlist and alert actions continue to work after a market fallback response.

## Regression Checks

- [ ] Open Market, Coin Detail, Watchlist, and Market Alerts routes and confirm they still load.
- [ ] Refresh the Market page repeatedly and confirm the UI stays populated.
- [ ] Trigger a buy/sell flow and confirm the market cache refreshes without breaking the page.
- [ ] Verify charts, trending coins, watchlists, and alerts continue updating after background socket events.

## Performance Checks

- [ ] Confirm backend responses are served from cache on repeat requests within 60 seconds.
- [ ] Confirm the Market route chunk loads separately from the main app shell.
- [ ] Confirm the lazy-loaded trade modal and mentor panel are not part of the initial route chunk.
