import mongoose from 'mongoose';

const { Schema } = mongoose;

const participantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    startingValue: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    tradesCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const tradingCompetitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    prize: { type: String, default: 'XP rewards and profile badge' },
    isActive: { type: Boolean, default: true, index: true },
    participants: [participantSchema],
    winner: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

tradingCompetitionSchema.index({ isActive: 1, endsAt: 1 });
tradingCompetitionSchema.index({ 'participants.user': 1 });

export default mongoose.model('TradingCompetition', tradingCompetitionSchema);
