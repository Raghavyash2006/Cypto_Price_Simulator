// Simple in-memory price simulator for demo purposes
const coins = [
  { symbol: 'BTC', name: 'Bitcoin', price: 56000 },
  { symbol: 'ETH', name: 'Ethereum', price: 3600 },
  { symbol: 'SOL', name: 'Solana', price: 120 },
  { symbol: 'ADA', name: 'Cardano', price: 0.46 }
];

function randomDelta() {
  return (Math.random() - 0.5) * 0.02; // +-1%
}

export function getInitialPrices() {
  return coins.map((c) => ({ ...c, priceHistory: Array.from({ length: 12 }, (_, i) => c.price * (1 + randomDelta() * i)) }));
}

export function tick(prices) {
  return prices.map((p) => {
    const last = p.priceHistory[p.priceHistory.length - 1] || p.price;
    const delta = randomDelta();
    const next = Math.max(0.0001, last * (1 + delta));
    const history = p.priceHistory.slice(-11).concat(next);
    return { ...p, priceHistory: history };
  });
}
