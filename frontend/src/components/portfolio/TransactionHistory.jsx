import { motion } from 'framer-motion';
import { formatMoney, safeNumber } from '../../features/portfolio/formatters';

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function TransactionHistory({ transactions = [] }) {
  if (!transactions.length) {
    return <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-400">No transactions yet.</div>;
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const isBuy = transaction.type === 'buy';
        const amount = safeNumber(transaction.amount);
        const quantity = safeNumber(transaction.quantity);

        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.25em] ${isBuy ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                  {transaction.type}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{transaction.coinName || transaction.coinId || transaction.symbol}</div>
                  <div className="text-xs text-slate-400">{formatTime(transaction.timestamp)}</div>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 md:text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Quantity</div>
                  <div className="mt-1 font-semibold text-white">{quantity}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Unit price</div>
                  <div className="mt-1 font-semibold text-white">{formatMoney(transaction.unitPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Total</div>
                  <div className="mt-1 font-semibold text-white">{formatMoney(amount)}</div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}