import mongoose from 'mongoose';

const { Schema } = mongoose;

const participantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    startingValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    roiPct: { type: Number, default: 0 },
    tradesCount: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date },
    rank: { type: Number, default: 0 }
  },
  { _id: false }
);

const tradeArenaMatchSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    mode: { type: String, enum: ['battle', 'tournament'], default: 'battle', index: true },
    status: { type: String, enum: ['waiting', 'active', 'completed', 'cancelled'], default: 'waiting', index: true },
    description: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    durationMinutes: { type: Number, default: 15, min: 5 },
    startsAt: { type: Date, default: Date.now, index: true },
    endsAt: { type: Date, required: true, index: true },
    entryFee: { type: Number, default: 0, min: 0 },
    prizePool: { type: Number, default: 0, min: 0 },
    maxParticipants: { type: Number, default: 2, min: 2 },
    participants: [participantSchema],
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
    rewardStatus: { type: String, enum: ['pending', 'distributed'], default: 'pending' },
    leaderboardSnapshot: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

tradeArenaMatchSchema.index({ mode: 1, status: 1, endsAt: 1 });
tradeArenaMatchSchema.index({ 'participants.user': 1 });

export default mongoose.model('TradeArenaMatch', tradeArenaMatchSchema);
