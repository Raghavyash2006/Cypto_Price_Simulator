export function buildRecommendations(user) {
  const level = user?.learningLevel || 'beginner';

  return {
    level,
    focus: level === 'beginner' ? 'Foundations and wallet safety' : 'Advanced market analysis and DeFi',
    aiHint: 'Use this scaffold to steer mentor responses, then refine it with live market context.'
  };
}

const learningPathTemplates = {
  beginner: [
    'Learn wallet basics and seed phrase safety',
    'Understand market orders, slippage, and volatility',
    'Practice a first simulated trade with small position sizing'
  ],
  intermediate: [
    'Compare spot trading to long-term holding strategies',
    'Study technical indicators and risk controls',
    'Use the simulator to test entries and exits around news events'
  ],
  advanced: [
    'Model position sizing and portfolio drawdown limits',
    'Explore DeFi yield, liquidity pools, and impermanent loss',
    'Review market summaries before deploying a strategy drill'
  ],
  expert: [
    'Stress-test multi-asset strategies with simulated capital',
    'Use advanced market structure, sentiment, and volatility cues',
    'Teach back a concept and refine your personal playbook'
  ]
};

export function buildLearningPath(user) {
  const level = user?.learningLevel || user?.level || 'beginner';
  const key = learningPathTemplates[level] ? level : 'beginner';

  return learningPathTemplates[key].map((step, index) => ({
    id: `${key}-${index + 1}`,
    title: step,
    xpReward: key === 'beginner' ? 80 + index * 20 : 120 + index * 30
  }));
}

export function buildSuggestedPrompts(user, marketSummary = {}) {
  const level = user?.learningLevel || user?.level || 'beginner';
  const movers = Array.isArray(marketSummary.topMovers) ? marketSummary.topMovers.slice(0, 2) : [];
  const moverNames = movers.map((coin) => coin.name || coin.symbol || 'the market');

  const levelPrompts = {
    beginner: [
      'Explain crypto like I am new to investing.',
      'What is the safest first step before buying a coin?',
      'How do I read a candle chart and avoid hype?' 
    ],
    intermediate: [
      'Show me how to manage risk on a small portfolio.',
      'Explain how I can use market momentum without chasing pumps.',
      'What should I focus on in my next practice session?'
    ],
    advanced: [
      'Analyze my strategy for downside risk and portfolio drawdown.',
      'How can I use DeFi opportunities without overexposure?',
      'Turn this market summary into a weekly learning plan.'
    ],
    expert: [
      'Stress-test my thesis against market volatility.',
      'Identify the key assumptions in my current strategy.',
      'Build a high-level plan from this week’s market action.'
    ]
  };

  const dynamicPrompts = moverNames.length
    ? [
        `What does the current move in ${moverNames[0]} suggest for a beginner?`,
        moverNames[1] ? `Compare the risk profile of ${moverNames[0]} and ${moverNames[1]}.` : null
      ].filter(Boolean)
    : [];

  return [...(levelPrompts[level] || levelPrompts.beginner), ...dynamicPrompts].slice(0, 6);
}