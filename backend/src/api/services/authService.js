export function normalizeProfile(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    learningLevel: user.learningLevel,
    xp: user.xp
  };
}