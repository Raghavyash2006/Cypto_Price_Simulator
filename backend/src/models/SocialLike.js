import mongoose from 'mongoose';

const { Schema } = mongoose;

const socialLikeSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'SocialPost', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true }
);

socialLikeSchema.index({ post: 1, user: 1 }, { unique: true });
socialLikeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('SocialLike', socialLikeSchema);
