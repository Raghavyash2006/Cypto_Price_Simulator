import mongoose from 'mongoose';

const { Schema } = mongoose;

const socialActivitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      required: true,
      enum: ['follow', 'friend_request', 'friend_accept', 'post', 'comment', 'like', 'trade', 'competition', 'profile_update']
    },
    entityType: { type: String, default: '' },
    entityId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
    visibility: { type: String, enum: ['public', 'followers', 'friends'], default: 'public', index: true }
  },
  { timestamps: true }
);

socialActivitySchema.index({ createdAt: -1 });
socialActivitySchema.index({ targetUser: 1, createdAt: -1 });

export default mongoose.model('SocialActivity', socialActivitySchema);
