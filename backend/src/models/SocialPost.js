import mongoose from 'mongoose';

const { Schema } = mongoose;

const socialPostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    visibility: { type: String, enum: ['public', 'followers', 'friends'], default: 'public', index: true },
    tags: [{ type: String, trim: true }],
    mediaUrl: { type: String, default: '' },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

socialPostSchema.index({ visibility: 1, createdAt: -1 });
socialPostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('SocialPost', socialPostSchema);
