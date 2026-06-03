import { motion } from 'framer-motion';

export default function CoinCard({ coin, onClick }) {
  const price = coin?.market_data?.current_price?.usd ?? (coin?.current_price || 0);
  const change = coin?.market_data?.price_change_percentage_24h ?? coin?.price_change_percentage_24h;

  return (
    <motion.div layout whileHover={{ y: -6 }} onClick={() => onClick && onClick(coin)} className="cursor-pointer rounded-xl border border-white/10 bg-white/3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{coin.name || coin.symbol.toUpperCase()}</div>
          <div className="text-xs text-slate-400">{coin.symbol?.toUpperCase()}</div>
        </div>
        <div className="text-right">
          <div className="font-bold">${Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className={`text-sm ${change >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>{change ? `${change.toFixed(2)}%` : '-'}</div>
        </div>
      </div>
    </motion.div>
  );
}
