import mongoose from 'mongoose';

const { Schema } = mongoose;

const friendRequestSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending', index: true }
  },
  { timestamps: true }
);

friendRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });

export default mongoose.model('FriendRequest', friendRequestSchema);
