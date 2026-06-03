import mongoose from 'mongoose';

const { Schema } = mongoose;

const socialCommentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'SocialPost', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

socialCommentSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model('SocialComment', socialCommentSchema);
