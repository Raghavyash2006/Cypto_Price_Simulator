import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// Simple level system: every 1000 XP = next numeric level. Map to labels.
function levelFromXp(xp) {
  const lvlNum = Math.floor(xp / 1000) + 1;
  let label = 'Beginner';
  if (lvlNum >= 10) label = 'Expert';
  else if (lvlNum >= 5) label = 'Advanced';
  else if (lvlNum >= 2) label = 'Intermediate';
  return { lvlNum, label, xpToNext: lvlNum * 1000 - xp };
}

export async function awardXp(userId, amount, reason = 'reward') {
  if (amount <= 0) return null;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    user.xp = (user.xp || 0) + amount;
    // level check
    const before = levelFromXp(user.xp - amount);
    const after = levelFromXp(user.xp);
    let levelUp = false;
    if (after.lvlNum > before.lvlNum) {
      user.level = after.label.toLowerCase();
      levelUp = true;
    }

    // add notification
    user.notifications.unshift({ type: 'xp', message: `You earned ${amount} XP (${reason})`, metadata: { amount } });
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
    return { user: user.toSafeObject(), levelUp, after };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function grantAchievement(userId, achievementId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    const achievement = await Achievement.findById(achievementId).session(session);
    if (!user || !achievement) throw new Error('Missing user or achievement');
    if (user.achievements.includes(achievement._id)) {
      await session.commitTransaction();
      session.endSession();
      return null;
    }
    user.achievements.push(achievement._id);
    user.badges.push(achievement._id);
    user.xp = (user.xp || 0) + (achievement.xpReward || 0);
    user.notifications.unshift({ type: 'achievement', message: `Unlocked achievement: ${achievement.title}`, metadata: { achievementId } });
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
    return achievement;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function claimDailyStreak(userId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const last = user.lastStreakAt ? new Date(user.lastStreakAt) : null;
    const oneDay = 24 * 60 * 60 * 1000;
    let increment = false;
    if (!last || now - last >= oneDay) {
      // if last was yesterday (within 48h) increment, else reset
      if (last && now - last < 2 * oneDay) user.streak = (user.streak || 0) + 1;
      else user.streak = 1;
      user.lastStreakAt = now;
      increment = true;
    } else {
      throw new Error('Streak already claimed today');
    }

    const xpAward = 50 + Math.min(user.streak * 10, 200);
    user.xp = (user.xp || 0) + xpAward;
    user.notifications.unshift({ type: 'streak', message: `Streak: ${user.streak} day(s) — +${xpAward} XP`, metadata: { xpAward } });
    await user.save({ session });
    await session.commitTransaction();
    session.endSession();
    return { streak: user.streak, xpAward };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function processReferral(referrerCode, newUserId) {
  // find referrer by code
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const referrer = await User.findOne({ referralCode: referrerCode }).session(session);
    const newUser = await User.findById(newUserId).session(session);
    if (!referrer || !newUser) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    referrer.virtualBalance = (referrer.virtualBalance || 0) + 100; // reward
    referrer.notifications.unshift({ type: 'referral', message: `Referral bonus: +100 coins`, metadata: {} });
    newUser.referredBy = referrer._id;
    await referrer.save({ session });
    await newUser.save({ session });
    await session.commitTransaction();
    session.endSession();
    return referrer;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export async function getLeaderboard(limit = 50) {
  const users = await User.find().sort({ xp: -1 }).limit(limit).select('username xp avatar').lean().exec();
  return users;
}
