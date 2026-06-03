import mongoose from 'mongoose';

const { Schema } = mongoose;

const marketSnapshotSchema = new Schema(
  {
    bucketKey: { type: String, required: true, unique: true, index: true },
    capturedAt: { type: Date, required: true, index: true },
    global: { type: Schema.Types.Mixed, default: {} },
    coins: { type: [Schema.Types.Mixed], default: [] },
    trending: { type: [Schema.Types.Mixed], default: [] },
    movers: { type: Schema.Types.Mixed, default: {} },
    prices: { type: Schema.Types.Mixed, default: {} },
    sentiment: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

marketSnapshotSchema.index({ capturedAt: -1 });

export default mongoose.model('MarketSnapshot', marketSnapshotSchema);