// ─────────────────────────────────────────────
// Shared TypeScript interfaces for the UNIQUE app
// One place — no more duplicating these in every screen
// ─────────────────────────────────────────────

export interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  isActive: boolean;
  comingSoon: boolean;
  icon?: string;
  color?: string;
  universityId?: string;
}

export interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  collegeId: string;
  topics: string[];
  teacherIds: string[];
}

export interface Level {
  _id: string;
  title: string;
  titleEn?: string;
  subjectId: string;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
}

export interface Unit {
  _id: string;
  title: string;
  titleEn?: string;
  levelId: string;
  subjectId: string;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
  examEnabled: boolean;
}

export interface Lesson {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  unitId?: string;
  videoUrl: string;
  videoType?: "youtube" | "direct";
  keyPoints: string[];
  vocabulary: { word: string; definition: string }[];
  order: number;
  isFree: boolean;
  isPublished: boolean;
  isEssential?: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  summaryText?: string;
  aiExplanation?: string;
}

export interface LessonProgress {
  _id: string;
  userId: string;
  lessonId: string;
  unitId: string;
  subjectId: string;
  watchedVideo: boolean;
  passedQuiz: boolean;
  score?: number;
  completedAt?: string;
}

export interface Question {
  _id: string;
  question: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  topicId: string;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  answers: {
    questionId: string;
    selected: number;
    correct: number;
    isCorrect: boolean;
    explanation: string;
    question: string;
    options: string[];
  }[];
}

export type NoteType = "general" | "question" | "summary" | "important";

export interface StudentNote {
  _id: string;
  userId: string;
  lessonId?: string;
  unitId?: string;
  subjectId?: string;
  title?: string;
  content: string;
  color: string;
  type: NoteType;
  isStarred: boolean;
  tags?: string[];
  reminderAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface University {
  _id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  logo?: string;
  color?: string;
  isActive: boolean;
  colleges: College[];
}

export interface VocabularyItem {
  word: string;
  definition: string;
}

export interface ExamEligibility {
  eligible: boolean;
  reason?: "daily_limit" | "cooldown";
  nextAttemptAt?: string | null;
  alreadyPassed?: boolean;
  attemptsToday?: number;
  attemptsRemaining?: number;
}

export interface AiMessage {
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export interface AiConversation {
  _id: string;
  title: string;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
}
