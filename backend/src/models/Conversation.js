import mongoose from 'mongoose';

const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    role: { type: String, required: true, enum: ['system', 'user', 'assistant'] },
    content: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

const ConversationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'AI Mentor' },
    summary: { type: String, default: '' },
    messages: [MessageSchema],
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

ConversationSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('Conversation', ConversationSchema);
