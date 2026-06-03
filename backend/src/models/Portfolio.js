import mongoose from 'mongoose';

const { Schema } = mongoose;

const portfolioSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coinId: { type: String, trim: true, lowercase: true, index: true },
    coinName: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0 },
    buyPrice: { type: Number, required: true, min: 0 },
    currentPrice: { type: Number, default: 0, min: 0 },
    // profitLoss is computed on save and available as virtual
    profitLoss: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// keep a single entry per user+symbol for simplicity and fast lookups
portfolioSchema.index({ user: 1, symbol: 1 }, { unique: true });
portfolioSchema.index({ user: 1, coinId: 1 }, { unique: true, sparse: true });

portfolioSchema.virtual('marketValue').get(function () {
  return (this.currentPrice || 0) * (this.quantity || 0);
});

portfolioSchema.pre('save', function computeProfit(next) {
  try {
    this.profitLoss = ((this.currentPrice || 0) - (this.buyPrice || 0)) * (this.quantity || 0);
  } catch (err) {
    this.profitLoss = 0;
  }
  next();
});

export default mongoose.model('Portfolio', portfolioSchema);
