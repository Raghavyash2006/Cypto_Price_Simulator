import { memo } from 'react';
import { motion } from 'framer-motion';

const recs = [
  'Review gas optimization patterns',
  'Complete DeFi module: yield strategies',
  'Try the BTC momentum trading drill' 
];

function AIRecommendations() {
  return (
    <div>
      <h3 className="text-lg font-semibold">AI Recommendations</h3>
      <div className="mt-4 space-y-3">
        {recs.map((r, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-white/6 bg-white/3 p-3">
            <div className="text-sm">{r}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default memo(AIRecommendations);
