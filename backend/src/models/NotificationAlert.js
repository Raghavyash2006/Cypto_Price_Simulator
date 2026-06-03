import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationAlertSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['price', 'portfolio', 'movement'], index: true },
    title: { type: String, required: true, trim: true },
    coinId: { type: String, trim: true, lowercase: true, index: true },
    coinName: { type: String, trim: true, default: '' },
    symbol: { type: String, trim: true, uppercase: true, default: '' },
    direction: { type: String, enum: ['above', 'below'], default: 'above' },
    targetPrice: { type: Number, default: 0 },
    portfolioMetric: { type: String, enum: ['totalValue', 'profitLoss'], default: 'totalValue' },
    threshold: { type: Number, default: 0 },
    movementPercent: { type: Number, default: 0 },
    movementWindowMinutes: { type: Number, default: 60 },
    movementDirection: { type: String, enum: ['above', 'below'], default: 'above' },
    cooldownMinutes: { type: Number, default: 180 },
    isActive: { type: Boolean, default: true, index: true },
    lastMatched: { type: Boolean, default: false },
    lastTriggeredAt: { type: Date },
    lastTriggeredValue: { type: Number, default: 0 },
    lastTriggeredSignature: { type: String, default: '' },
    actionUrl: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

notificationAlertSchema.index({ user: 1, type: 1, isActive: 1 });
notificationAlertSchema.index({ user: 1, coinId: 1 });

export default mongoose.model('NotificationAlert', notificationAlertSchema);
