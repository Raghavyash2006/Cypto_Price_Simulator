import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    courseSlug: { type: String, required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    summary: { type: String, default: '' },
    keyConcepts: [{ type: String }],
    difficulty: { type: String, default: 'Beginner', index: true },
    estimatedDurationMinutes: { type: Number, default: 15 },
    estimatedReadingMinutes: { type: Number, default: 5 },
    xpReward: { type: Number, default: 100 },
    order: { type: Number, default: 0 },
    content: { type: String, required: true },
    takeaways: [{ type: String }],
    quiz: [
      {
        question: String,
        options: [String],
        answer: Number
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);