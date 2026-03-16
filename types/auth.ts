export type UserRole = "user" | "student" | "coach" | "maintainer";

export interface Profile {
  id: string;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string | null;
}

