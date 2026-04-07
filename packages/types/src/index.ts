export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogEntry {
  id: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface Specialist {
  id: string;
  name: string;
  specialty: string;
  email: string;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "superadmin";
  createdAt: Date;
}
