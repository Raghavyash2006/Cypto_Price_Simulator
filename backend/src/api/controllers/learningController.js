import asyncHandler from '../../utils/asyncHandler.js';

const modules = [
  { id: 'blockchain-basics', title: 'Blockchain basics', xp: 120 },
  { id: 'wallet-security', title: 'Wallet security', xp: 150 },
  { id: 'defi-intro', title: 'DeFi introduction', xp: 180 }
];

export const getModules = asyncHandler(async (_req, res) => {
  res.json({ modules });
});

export const getRecommendations = asyncHandler(async (req, res) => {
  const level = req.user?.learningLevel || 'beginner';
  const recommendations = level === 'beginner' ? modules.slice(0, 2) : modules;

  res.json({ recommendations });
});