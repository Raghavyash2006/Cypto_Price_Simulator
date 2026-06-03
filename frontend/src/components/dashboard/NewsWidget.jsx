import { useEffect, useState } from 'react';

const sample = [
  { id: 1, title: 'BTC hits new resistance', src: 'CoinDesk' },
  { id: 2, title: 'DeFi TVL sees steady growth', src: 'TheBlock' },
  { id: 3, title: 'New Layer-2 gains traction', src: 'CryptoBriefing' }
];

export default function NewsWidget() {
  const [items] = useState(sample);

  useEffect(() => {
    // placeholder for real news fetch
  }, []);

  return (
    <div>
      <h3 className="text-lg font-semibold">Latest crypto news</h3>
      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <a key={it.id} className="block rounded-xl border border-white/6 bg-white/3 p-3">
            <div className="text-sm font-semibold">{it.title}</div>
            <div className="mt-1 text-xs text-slate-400">{it.src}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
