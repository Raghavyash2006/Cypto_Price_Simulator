import mongoose from 'mongoose';

const { Schema } = mongoose;

const arenaQueueEntrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: ['battle'], default: 'battle', index: true },
    status: { type: String, enum: ['waiting', 'matched', 'cancelled', 'expired'], default: 'waiting', index: true },
    durationMinutes: { type: Number, default: 15 },
    entryFee: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },
    preferences: { type: Schema.Types.Mixed },
    matchedMatch: { type: Schema.Types.ObjectId, ref: 'TradeArenaMatch' },
    expiresAt: { type: Date, index: true }
  },
  { timestamps: true }
);

arenaQueueEntrySchema.index({ mode: 1, status: 1, createdAt: 1 });

export default mongoose.model('ArenaQueueEntry', arenaQueueEntrySchema);
