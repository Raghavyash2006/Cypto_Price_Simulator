import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    difficulty: { type: String, required: true, index: true },
    estimatedDurationMinutes: { type: Number, required: true },
    xpReward: { type: Number, required: true },
    order: { type: Number, default: 0, index: true },
    lessonCount: { type: Number, default: 0 },
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    isPublished: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.models.Course || mongoose.model('Course', courseSchema);