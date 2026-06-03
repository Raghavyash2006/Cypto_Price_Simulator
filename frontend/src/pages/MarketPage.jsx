import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Skeleton from '../components/common/Skeleton';
import SearchBar from '../components/market/SearchBar';
import MarketStatCard from '../components/market/MarketStatCard';
import MarketChartPanel from '../components/market/MarketChartPanel';
import MarketTable from '../components/market/MarketTable';
import MarketSentimentPanel from '../components/market/MarketSentimentPanel';
import { createNotificationAlert, deleteNotificationAlert, listNotificationAlerts } from '../services/notificationsApi';
import { buyPortfolioAsset } from '../services/portfolioApi';
import { useMarketModule } from '../features/market/useMarketModule';
import { useWatchlistModule } from '../features/market/useWatchlistModule';

function formatCurrency(value, fractionDigits = 0) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: fractionDigits })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function MarketPill({ coin, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-full border px-4 py-2 text-left text-sm transition ${active ? 'border-cyan-400/30 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
    >
      <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-950/60">
        {coin?.image ? <img src={coin.image} alt={coin.name} className="h-6 w-6 object-contain" /> : <span className="text-xs font-black">{String(coin?.symbol || '?').slice(0, 3).toUpperCase()}</span>}
      </div>
      <div>
        <div className="font-semibold">{coin?.name || 'Coin'}</div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{String(coin?.symbol || '').toUpperCase()}</div>
      </div>
    </button>
  );
}

export default function MarketPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [alerts, setAlerts] = useState([]);
  const [buyModal, setBuyModal] = useState({ open: false, coin: null });
  const [buying, setBuying] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    type: 'price',
    title: '',
    coinId: '',
    symbol: '',
    coinName: '',
    direction: 'above',
    targetPrice: '',
    portfolioMetric: 'totalValue',
    threshold: ''
  });

  const { overview, coins, trending, movers, selectedCoin, selectedCoinId, setSelectedCoinId, chartSeries, chartStatus, chartError, status, error, lastUpdated, marketAgeSeconds, sentiment, events, flashById, reload } = useMarketModule();
  const { addCoin: addToWatchlist } = useWatchlistModule();

  useEffect(() => {
    void loadAlerts();
  }, []);

  const filteredCoins = useMemo(() => {
    if (!deferredQuery) return coins;
    return coins.filter((coin) => {
      const name = String(coin.name || '').toLowerCase();
      const symbol = String(coin.symbol || '').toLowerCase();
      return name.includes(deferredQuery) || symbol.includes(deferredQuery);
    });
  }, [coins, deferredQuery]);

  const visibleSelectedCoin = useMemo(() => {
    if (!filteredCoins.length) return selectedCoin;
    return filteredCoins.find((coin) => coin.id === selectedCoinId) || filteredCoins[0] || selectedCoin;
  }, [filteredCoins, selectedCoin, selectedCoinId]);

  const openBuyModal = () => setBuyModal({ open: true, coin: visibleSelectedCoin });

  const handleAddToWatchlist = async (coin) => {
    try {
      await addToWatchlist(coin);
      toast.success(`${coin?.name || 'Coin'} added to watchlist`);
    } catch (watchlistError) {
      toast.error(watchlistError?.response?.data?.message || watchlistError?.message || 'Unable to update watchlist');
    }
  };

  const handleBuySubmit = async (payload) => {
    setBuying(true);
    try {
      await buyPortfolioAsset(payload);
      toast.success('Buy order executed');
      setBuyModal({ open: false, coin: null });
      await reload();
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Unable to buy asset';
      toast.error(message);
    } finally {
      setBuying(false);
    }
  };

  async function loadAlerts() {
    try {
      const data = await listNotificationAlerts();
      setAlerts(data.alerts || []);
    } catch {
      setAlerts([]);
    }
  }

  async function handleCreateAlert(event) {
    event.preventDefault();
    setSavingAlert(true);
    try {
      const payload = alertForm.type === 'portfolio'
        ? {
            type: 'portfolio',
            title: alertForm.title,
            portfolioMetric: alertForm.portfolioMetric,
            direction: alertForm.direction,
            threshold: Number(alertForm.threshold),
            actionUrl: '/dashboard'
          }
        : {
            type: 'price',
            title: alertForm.title,
            coinId: alertForm.coinId,
            coinName: alertForm.coinName,
            symbol: alertForm.symbol,
            direction: alertForm.direction,
            targetPrice: Number(alertForm.targetPrice),
            actionUrl: '/market'
          };

      await createNotificationAlert(payload);
      await loadAlerts();
      setAlertForm((current) => ({
        ...current,
        title: '',
        coinId: '',
        symbol: '',
        coinName: '',
        targetPrice: '',
        threshold: ''
      }));
    } finally {
      setSavingAlert(false);
    }
  }

  async function handleRemoveAlert(alertId) {
    await deleteNotificationAlert(alertId);
    await loadAlerts();
  }

  const global = overview?.global || {};
  const activeMarketCoins = filteredCoins.slice(0, 60);
  const trendingCoins = trending.length ? trending : coins.slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel-strong rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Market module</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Real-time crypto market intelligence with a premium trading-terminal feel.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Explore global market metrics, trending coins, and live price movement from CoinGecko through the platform's backend API layer.</p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{marketAgeSeconds !== null ? `Market updated ${marketAgeSeconds}s ago` : 'Live overview'}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{status === 'loading' ? 'Syncing market data...' : 'Backend cached'}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{user ? `Watching as ${user.username}` : 'Public market view'}</span>
                <Link to="/watchlist" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300 transition hover:bg-white/10">Watchlist</Link>
                <Link to="/market/alerts" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300 transition hover:bg-white/10">Alerts</Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openBuyModal}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_-22px_rgba(34,211,238,0.7)]"
              >
                Buy selected
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={reload}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Refresh market
              </motion.button>
            </div>
          </div>

          <div className="mt-6">
            <SearchBar
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              placeholder="Search coin name or symbol in real time..."
            />
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
              <div>{error}</div>
              <button type="button" onClick={reload} className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                Retry
              </button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {status === 'loading' && !overview
              ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[1.5rem]" />)
              : (
                <>
                  <MarketStatCard title="Total market cap" value={formatCurrency(global.total_market_cap?.usd)} detail={`24h change ${formatPercent(global.market_cap_change_percentage_24h_usd)}`} tone="cyan" />
                  <MarketStatCard title="BTC dominance" value={formatPercent(global.market_cap_percentage?.btc)} detail="Share of total market cap" tone="amber" />
                  <MarketStatCard title="24h volume" value={formatCurrency(global.total_volume?.usd)} detail={`Active markets ${Number(global.markets || 0).toLocaleString()}`} tone="emerald" />
                  <MarketStatCard title="Active assets" value={Number(global.active_cryptocurrencies || coins.length || 0).toLocaleString()} detail="Tracked by CoinGecko" tone="cyan" />
                </>
              )}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Trending coins</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Market momentum</h2>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">CoinGecko</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {trendingCoins.length ? trendingCoins.map((coin) => {
                const item = coin?.item || coin;
                return (
                  <MarketPill
                    key={item.id || item.symbol}
                    coin={item}
                    active={selectedCoinId === item.id}
                    onClick={() => setSelectedCoinId(item.id)}
                  />
                );
              }) : (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400">
                  Trending data is warming up. Cached market fallbacks will keep this area populated.
                </div>
              )}
            </div>
          </div>
        </div>

        <MarketChartPanel
          coin={visibleSelectedCoin}
          series={chartSeries}
          status={chartStatus}
          error={chartError}
          onRetry={reload}
          onAddToWatchlist={handleAddToWatchlist}
          onOpenDetail={(coin) => navigate(`/market/coin/${coin?.id}`)}
        />
      </div>

      <MarketSentimentPanel sentiment={sentiment} riskWarnings={sentiment?.riskWarnings || []} events={events || []} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Trending categories</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Where the market is concentrating</h2>
            </div>
            <Link to="/market/alerts" className="text-sm text-amber-200 hover:underline">Open alerts</Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(sentiment?.sentiment?.categories || []).slice(0, 4).map((category) => (
              <div key={category.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Trending category</p>
                <div className="mt-2 text-lg font-semibold text-white">{category.name}</div>
                <div className="mt-1 text-sm text-slate-400">Market cap {Number(category.marketCap || 0).toLocaleString()}</div>
              </div>
            ))}
            {!((sentiment?.sentiment?.categories || []).length) && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">Trending categories will appear once the sentiment feed loads.</div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Watchlist</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Personal tracking hub</h3>
            </div>
            <Link to="/watchlist" className="text-sm text-cyan-300 hover:underline">Open</Link>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Coins tracked</div>
              <div className="mt-1 text-2xl font-black text-white">{(sentiment?.riskWarnings?.length || 0) > 0 ? 'Live' : 'Ready'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Next step</div>
              <p className="mt-1 text-slate-400">Open the dedicated watchlist page to manage coins, quick trade, and set alerts from one place.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Market table</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Live coins ranked by market cap</h2>
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Click any row to inspect the chart</div>
          </div>

          <div className="mt-6">
            <MarketTable
              coins={activeMarketCoins}
              selectedCoinId={selectedCoinId}
              onSelectCoin={(coin) => setSelectedCoinId(coin.id)}
              loading={status === 'loading' && !overview}
              emptyMessage={deferredQuery ? 'No assets match your search. Try a different name or symbol.' : 'No market data available.'}
              onAddToWatchlist={handleAddToWatchlist}
              flashById={flashById}
              onOpenDetail={(coin) => navigate(`/market/coin/${coin?.id}`)}
            />
          </div>

          {deferredQuery && activeMarketCoins.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              Search is filtering the current market snapshot locally. Broaden your query or clear it to restore the full list.
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2.5rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Market leaders</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Top gainers & losers</h3>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">24h</span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Top gainers</p>
                <div className="mt-3 space-y-2">
                  {movers.topGainers.slice(0, 5).map((coin) => (
                    <div key={coin.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{coin.name}</div>
                        <div className="text-xs text-slate-500">#{coin.market_cap_rank || '—'} {String(coin.symbol || '').toUpperCase()}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-300">{formatPercent(coin.price_change_percentage_24h)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Top losers</p>
                <div className="mt-3 space-y-2">
                  {movers.topLosers.slice(0, 5).map((coin) => (
                    <div key={coin.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{coin.name}</div>
                        <div className="text-xs text-slate-500">#{coin.market_cap_rank || '—'} {String(coin.symbol || '').toUpperCase()}</div>
                      </div>
                      <div className="text-sm font-semibold text-rose-300">{formatPercent(coin.price_change_percentage_24h)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Alerts</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Price & portfolio watchlist</h3>
              </div>
              <Link to="/market/alerts" className="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-300">Saved</Link>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCreateAlert}>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={alertForm.type}
                  onChange={(event) => setAlertForm((current) => ({ ...current, type: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="price">Price alert</option>
                  <option value="portfolio">Portfolio alert</option>
                </select>
                <input
                  value={alertForm.title}
                  onChange={(event) => setAlertForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Alert title"
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              {alertForm.type === 'price' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={alertForm.coinId}
                    onChange={(event) => setAlertForm((current) => ({ ...current, coinId: event.target.value, symbol: event.target.value, coinName: event.target.value }))}
                    placeholder="coin id (bitcoin)"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <input
                    value={alertForm.targetPrice}
                    onChange={(event) => setAlertForm((current) => ({ ...current, targetPrice: event.target.value }))}
                    placeholder="Target price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <select
                    value={alertForm.direction}
                    onChange={(event) => setAlertForm((current) => ({ ...current, direction: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <input
                    value={alertForm.symbol}
                    onChange={(event) => setAlertForm((current) => ({ ...current, symbol: event.target.value }))}
                    placeholder="symbol"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={alertForm.portfolioMetric}
                    onChange={(event) => setAlertForm((current) => ({ ...current, portfolioMetric: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="totalValue">Total value</option>
                    <option value="profitLoss">Profit / loss</option>
                  </select>
                  <select
                    value={alertForm.direction}
                    onChange={(event) => setAlertForm((current) => ({ ...current, direction: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                  <input
                    value={alertForm.threshold}
                    onChange={(event) => setAlertForm((current) => ({ ...current, threshold: event.target.value }))}
                    placeholder="Threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={savingAlert}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAlert ? 'Saving...' : 'Create alert'}
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{alert.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {alert.type === 'price'
                            ? `${alert.coinId} ${alert.direction} $${Number(alert.targetPrice || 0).toLocaleString()}`
                            : `${alert.portfolioMetric} ${alert.direction} ${Number(alert.threshold || 0).toLocaleString()}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAlert(alert.id)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No alerts yet. Open the alert panel to create price, portfolio, or movement watches.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[2.5rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Quick links</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Move faster across market tools</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <Link to="/watchlist" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">Open watchlist</Link>
              <Link to="/market/alerts" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">Manage alerts</Link>
              <Link to={`/market/coin/${visibleSelectedCoin?.id || 'bitcoin'}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">Open coin detail</Link>
            </div>
          </div>
        </div>
      </div>

      {buyModal.open ? (
        <Suspense fallback={<TradeModalFallback />}>
          <TradeModal
            open={buyModal.open}
            mode="buy"
            coin={buyModal.coin}
            loading={buying}
            onClose={() => setBuyModal({ open: false, coin: null })}
            onSubmit={handleBuySubmit}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

const TradeModal = lazy(() => import('../components/portfolio/TradeModal'));

function TradeModalFallback() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-sm text-slate-300 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.95)]">
        Loading trade form…
      </div>
    </div>
  );
}