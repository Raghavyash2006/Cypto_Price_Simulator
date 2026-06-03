import mongoose from 'mongoose';

const { Schema } = mongoose;

const answerSchema = new Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedAnswers: [{ type: Number, required: true }],
    correct: { type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0 }
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    level: { type: String, required: true, index: true },
    timeLimitSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    score: { type: Number, default: 0, index: true },
    percentage: { type: Number, default: 0, index: true },
    xpAwarded: { type: Number, default: 0, index: true },
    isPassed: { type: Boolean, default: false, index: true },
    answers: [answerSchema],
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

quizAttemptSchema.index({ user: 1, createdAt: -1 });
quizAttemptSchema.index({ quiz: 1, score: -1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
