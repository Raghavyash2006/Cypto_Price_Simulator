import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchCoinDetails } from '../services/marketApi';
import { buyCoin, sellCoin, getPortfolio, getPortfolioAnalytics } from '../services/tradeApi';
import PortfolioChart from '../components/charts/PortfolioChart';

export default function TradePage() {
  const [coinId, setCoinId] = useState('bitcoin');
  const [quantity, setQuantity] = useState(0.01);
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchCoinDetails(coinId).then(setCoin).catch(() => setCoin(null));
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      const p = await getPortfolio();
      setPortfolio(p.portfolio || []);
      const a = await getPortfolioAnalytics();
      setAnalytics(a);
    } catch (err) {
      // ignore
    }
  }

  async function handleBuy() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await buyCoin(coinId, Number(quantity));
      setMessage(res.message || 'Bought');
      await loadPortfolio();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Buy failed');
    }
    setLoading(false);
  }

  async function handleSell() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await sellCoin(coinId, Number(quantity));
      setMessage(res.message || 'Sold');
      await loadPortfolio();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Sell failed');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
        <div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Trade</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-400">Coin ID (CoinGecko)</label>
              <input value={coinId} onChange={(e) => setCoinId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3" />

              <label className="block text-sm text-slate-400">Quantity</label>
              <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3" />

              <div className="flex gap-3">
                <button onClick={handleBuy} disabled={loading} className="rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-900">{loading ? 'Processing...' : 'Buy'}</button>
                <button onClick={handleSell} disabled={loading} className="rounded-xl bg-red-500 px-4 py-2 font-semibold">{loading ? 'Processing...' : 'Sell'}</button>
              </div>

              {message && <div className="mt-3 rounded-md bg-emerald-600/10 p-3 text-sm text-emerald-300">{message}</div>}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Portfolio Chart</h3>
            <div className="mt-4">
              <PortfolioChart />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Portfolio Summary</h3>
            <div className="mt-3 text-sm text-slate-300">
              <div>Total Value: ${analytics?.totalValue?.toFixed(2) ?? '0.00'}</div>
              <div>Profit/Loss: ${analytics?.profitLoss?.toFixed(2) ?? '0.00'}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Holdings</h3>
            <div className="mt-3 space-y-2">
              {portfolio.map((p) => (
                <div key={p._id} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.symbol}</div>
                    <div className="text-sm text-slate-400">{p.quantity} @ ${p.currentPrice.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${p.marketValue.toFixed(2)}</div>
                    <div className={`text-sm ${p.profitLoss >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>{p.profitLoss.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
