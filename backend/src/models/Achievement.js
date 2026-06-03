import mongoose from 'mongoose';

const { Schema } = mongoose;

const achievementSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: '' },
    badgeImage: { type: String, default: '' },
    xpReward: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('Achievement', achievementSchema);
