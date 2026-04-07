// ─── Enums (mirror Prisma schema) ────────────────────────────────────────────

export enum UserRole {
  MAMA = "MAMA",
  SPECIALIST = "SPECIALIST",
}

export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  DEVELOPER = "DEVELOPER",
}

export enum SpecialistStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum SubscriptionPlan {
  FREE = "FREE",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  language: SupportedLanguage;
  theme: string;
}

export interface LogEntry {
  id: string;
  userId: string;
  date: Date;
  moodScore: number;
  emotions: string[];
  triggers: string[];
  notes: string | null;
  sleepHours: number | null;
  energyLevel: number | null;
  audioUrl: string | null;
  transcript: string | null;
  createdAt: Date;
}

export interface BehaviorLog {
  id: string;
  logEntryId: string;
  category: string;
  context: string | null;
  trigger: string | null;
  intensity: number | null;
  duration: number | null;
  mediaUrl: string | null;
  createdAt: Date;
}

export interface Specialist {
  id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  specialty: string;
  bio: string | null;
  diplomaUrl: string | null;
  status: SpecialistStatus;
  createdAt: Date;
}

export interface Article {
  id: string;
  specialistId: string;
  title: string;
  content: string;
  language: string;
  published: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: Date;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

export type SupportedLanguage = "ru" | "en";
