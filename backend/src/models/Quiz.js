import mongoose from 'mongoose';

const { Schema } = mongoose;

const questionSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    questionType: { type: String, enum: ['multiple_choice', 'true_false', 'scenario'], default: 'multiple_choice' },
    topic: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    options: [{ type: String, required: true }],
    // index of correct option(s) - supports single or multiple correct answers
    correctAnswers: [{ type: Number, required: true }],
    explanation: { type: String },
    hint: { type: String, default: '' },
    multiSelect: { type: Boolean, default: false }
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner', index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    timeLimitSeconds: { type: Number, default: 300, min: 30 },
    aiGenerated: { type: Boolean, default: false, index: true },
    sourceType: { type: String, enum: ['general', 'learning_lesson', 'learning_course'], default: 'general', index: true },
    sourceLesson: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null, index: true },
    sourceCourse: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    contextSummary: { type: String, default: '' },
    questions: [questionSchema],
    xpReward: { type: Number, default: 100, min: 0 }
  },
  { timestamps: true }
);

// Full text search over title and question content for discovery
quizSchema.index({ title: 'text', 'questions.question': 'text' });
quizSchema.index({ category: 1, level: 1, difficulty: 1 });

export default mongoose.model('Quiz', quizSchema);
