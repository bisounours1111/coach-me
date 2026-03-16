export type UserRole = "student" | "coach";

export interface Profile {
  id: string;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string | null;
}

