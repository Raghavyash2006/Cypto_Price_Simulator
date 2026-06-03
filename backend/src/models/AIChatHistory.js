import mongoose from 'mongoose';

const { Schema } = mongoose;

const AIChatHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true, enum: ['user'], default: 'user' },
    message: { type: String, required: true, trim: true },
    response: { type: String, required: true, trim: true },
    model: { type: String, default: '' },
    contextSnapshot: { type: Schema.Types.Mixed },
    marketSnapshot: { type: Schema.Types.Mixed },
    portfolioSnapshot: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

AIChatHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AIChatHistory', AIChatHistorySchema);