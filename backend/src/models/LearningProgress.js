import mongoose from 'mongoose';

const learningProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    completed: { type: Boolean, default: false },
    xpEarned: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

learningProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

export default mongoose.models.LearningProgress || mongoose.model('LearningProgress', learningProgressSchema);