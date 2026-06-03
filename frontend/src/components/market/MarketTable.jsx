import { memo } from 'react';
import MarketCoinRow from './MarketCoinRow';
import Skeleton from '../common/Skeleton';

function MarketTable({ coins = [], selectedCoinId, onSelectCoin, loading = false, emptyMessage = 'No coins match your search.', onAddToWatchlist, flashById = {}, onOpenDetail }) {
  return (
    <div className="space-y-4">
      <div className="hidden rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-[10px] uppercase tracking-[0.35em] text-slate-400 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] md:items-center">
        <div>Asset</div>
        <div>Price</div>
        <div>24h</div>
        <div>Market cap</div>
        <div>Volume</div>
        <div>Rank</div>
        <div>Actions</div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[1.5rem]" />
          ))}
        </div>
      ) : coins.length ? (
        <div className="space-y-3">
          {coins.map((coin) => (
            <MarketCoinRow
              key={coin.id}
              coin={coin}
              selected={coin.id === selectedCoinId}
              onSelect={onSelectCoin}
              onAddToWatchlist={onAddToWatchlist}
              flashDirection={flashById?.[coin.id] || null}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-400">{emptyMessage}</div>
      )}
    </div>
  );
}

export default memo(MarketTable);