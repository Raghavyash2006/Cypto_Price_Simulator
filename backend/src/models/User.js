import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    type: { type: String, required: true },
    title: { type: String, default: '' },
    message: { type: String, required: true },
    source: { type: String, default: 'system' },
    actionUrl: { type: String, default: '' },
    priority: { type: String, default: 'normal' },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    readAt: { type: Date }
  },
  { timestamps: true }
);

const ProgressSchema = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    progressPercent: { type: Number, min: 0, max: 100, default: 0 },
    completed: { type: Boolean, default: false },
    lastActivity: { type: Date },
    xpEarned: { type: Number, default: 0 }
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, unique: true, index: true },
    name: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    isAdmin: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    avatar: { type: String, default: '' },
    portfolioVisibility: { type: String, default: 'public', enum: ['public', 'followers', 'friends', 'private'] },
    xp: { type: Number, default: 0, index: true },
    level: { type: String, default: 'beginner', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
    streak: { type: Number, default: 0 },
    lastStreakAt: { type: Date },
    virtualBalance: { type: Number, default: 25000 },
    referralCode: { type: String, index: true, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    friends: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
    gamification: {
      claimedRewardKeys: [{ type: String }]
    },
    notifications: [NotificationSchema],
    learningProgress: [ProgressSchema],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    const baseCode = `${(this.username || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    this.referralCode = `${baseCode || 'USER'}-${randomSuffix}`;
  }

  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.matchPassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name,
    bio: this.bio,
    email: this.email,
    isAdmin: this.isAdmin,
    isActive: this.isActive,
    avatar: this.avatar,
    portfolioVisibility: this.portfolioVisibility,
    xp: this.xp,
    level: this.level,
    streak: this.streak,
    referralCode: this.referralCode,
    referralCount: this.referralCount,
    virtualBalance: this.virtualBalance,
    badges: this.badges,
    followersCount: Array.isArray(this.followers) ? this.followers.length : 0,
    followingCount: Array.isArray(this.following) ? this.following.length : 0,
    friendsCount: Array.isArray(this.friends) ? this.friends.length : 0
  };
};

// Text indexes for quick search
userSchema.index({ username: 'text', email: 'text' });

export default mongoose.model('User', userSchema);