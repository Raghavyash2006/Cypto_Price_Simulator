import mongoose from 'mongoose';

const { Schema } = mongoose;

const LearningAITurnSchema = new Schema(
  {
    action: { type: String, required: true, enum: ['explain', 'summarize', 'examples'] },
    question: { type: String, default: '' },
    responseTitle: { type: String, default: '' },
    responseMarkdown: { type: String, default: '' },
    model: { type: String, default: '' },
    fallbackUsed: { type: Boolean, default: false },
    contextSnapshot: { type: Schema.Types.Mixed }
  },
  { timestamps: true, _id: true }
);

const LearningAIConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    lessonSlug: { type: String, required: true, index: true },
    title: { type: String, default: 'Ask AI Teacher' },
    turns: [LearningAITurnSchema],
    lastAction: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

LearningAIConversationSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export default mongoose.models.LearningAIConversation || mongoose.model('LearningAIConversation', LearningAIConversationSchema);