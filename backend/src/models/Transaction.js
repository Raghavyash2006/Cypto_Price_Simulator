import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: ['buy', 'sell', 'deposit', 'withdraw', 'reward', 'fee'] },
    coinName: { type: String, trim: true },
    symbol: { type: String, trim: true, uppercase: true },
    quantity: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

transactionSchema.index({ user: 1, timestamp: -1 });

export default mongoose.model('Transaction', transactionSchema);
