import { memo, useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import { getInitialPrices, tick } from '../../services/priceSimulator';

const Sparkline = memo(function Sparkline({ data, color = '#f59e0b' }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{ data, borderColor: color, borderWidth: 1, pointRadius: 0, fill: false, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, elements: { line: { tension: 0.3 } }, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });

    return () => chart.destroy();
  }, [data, color]);

  return <canvas ref={ref} className="h-10 w-full" />;
});

function LivePrices() {
  const [prices, setPrices] = useState(getInitialPrices());

  useEffect(() => {
    const id = setInterval(() => setPrices((p) => tick(p)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-3">
      {prices.map((c) => (
        <motion.div
          key={c.symbol}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          className="glass-panel rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                {c.name} <span className="ml-2 text-xs text-slate-400">{c.symbol}</span>
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-white">${Number(c.priceHistory.at(-1)).toFixed(2)}</div>
            </div>
            <div className="ml-4 w-36">
              <Sparkline data={c.priceHistory} color="#22c55e" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default memo(LivePrices);
