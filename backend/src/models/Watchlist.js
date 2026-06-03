import mongoose from 'mongoose';

const { Schema } = mongoose;

const watchlistItemSchema = new Schema(
  {
    coinId: { type: String, required: true, trim: true, lowercase: true },
    coinName: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true, uppercase: true },
    image: { type: String, default: '' },
    addedPrice: { type: Number, default: 0, min: 0 },
    lastKnownPrice: { type: Number, default: 0, min: 0 },
    addedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' }
  },
  { _id: true }
);

const watchlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [watchlistItemSchema], default: [] }
  },
  { timestamps: true }
);

watchlistSchema.index({ user: 1, 'items.coinId': 1 });

export default mongoose.model('Watchlist', watchlistSchema);