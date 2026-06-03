import { memo } from 'react';
import { motion } from 'framer-motion';

const sample = [
  { id: 1, type: 'buy', symbol: 'BTC', amount: 0.02, value: '$1,120' },
  { id: 2, type: 'sell', symbol: 'ETH', amount: 0.6, value: '$2,160' },
  { id: 3, type: 'reward', symbol: 'XP', amount: 120, value: '120 XP' }
];

function TransactionsList() {
  return (
    <div className="space-y-3">
      {sample.map((t) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3">
          <div>
            <div className="text-sm font-semibold">{t.type.toUpperCase()}</div>
            <div className="text-xs text-slate-400">{t.symbol}</div>
          </div>
          <div className="text-right">
            <div className="font-medium">{t.value}</div>
            <div className="text-xs text-slate-400">{t.amount} qty</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default memo(TransactionsList);
