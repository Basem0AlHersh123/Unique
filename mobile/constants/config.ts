export const API_BASE_URL = "https://unique-tech-blond.vercel.app";

export const ENDPOINTS = {
  // Auth
  LOGIN:            "/api/auth/login",
  REGISTER:         "/api/auth/register",
  REFRESH:          "/api/auth/refresh",
  LOGOUT:           "/api/auth/logout",
  PROFILE:          "/api/auth/profile",
  CHANGE_PASSWORD:  "/api/auth/change-password",
  FORGOT_PASSWORD:  "/api/auth/forgot-password",
  UPDATE_PROFILE:   "/api/auth/profile",  // PATCH — push token, daily goal, reminder time

  // Content (public)
  COLLEGES:         "/api/admin/colleges",
  SUBJECTS:         "/api/admin/subjects",
  LEVELS:           "/api/admin/levels",
  UNITS:            "/api/admin/units",
  TOPICS:           "/api/admin/topics",
  QUESTIONS:        (slug: string) => `/api/questions/${slug}`,
  SUBMIT:           (slug: string) => `/api/questions/${slug}/submit`,

  // Progress (authenticated)
  PROGRESS_DASHBOARD: "/api/dashboard/progress",
  PROGRESS_LESSON:    "/api/progress/lesson",       // GET ?unitId=  |  POST
  PROGRESS_EXAM_CHECK: (unitId: string) => `/api/progress/unit-exam?unitId=${unitId}`,
  PROGRESS_EXAM_SUBMIT: "/api/progress/unit-exam",  // POST

  // Notes
  NOTES: "/api/notes",
  NOTE: (id: string) => `/api/notes/${id}`,

  // Universities
  UNIVERSITIES: "/api/admin/universities",
  UNIVERSITY: (slug: string) => `/api/universities/${slug}`,

  // Vocabulary / Flashcards
  VOCABULARY: (lessonId: string) => `/api/vocabulary/${lessonId}`,

  // AI
  AI_LESSON:          "/api/ai/lesson",
  AI_CHAT:            "/api/ai/chat",
  AI_CHAT_CONV:       (id: string) => `/api/ai/chat/${id}`,

  // Dashboard
  ADMIN_STATS:        "/api/admin/stats",
  TEACHER_STATS:      "/api/teacher/stats",
} as const;

// Replace with your Cloudflare Turnstile site key
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAAx9R-1EXAMPLE";

export const STORAGE_KEYS = {
  ACCESS_TOKEN:    "unique_access_token",
  USER:            "unique_user",
  UNIVERSITY_ID:   "unique_university_id",
  COLLEGE_ID:      "unique_college_id",
  SUBJECT_ID:      "unique_subject_id",
  LEVEL_ID:        "unique_level_id",
  DAILY_GOAL:      "unique_daily_goal",
  REMINDER_TIME:   "unique_reminder_time",
  REMINDER_ON:     "unique_reminder_on",
} as const;
