import mongoose from 'mongoose';

const { Schema } = mongoose;

const marketEventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: { type: String, default: 'normal', enum: ['low', 'normal', 'high', 'urgent'], index: true },
    source: { type: String, default: 'market', trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

marketEventSchema.index({ createdAt: -1 });
marketEventSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('MarketEvent', marketEventSchema);