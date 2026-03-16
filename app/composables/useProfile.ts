import type { Profile, UserRole } from "~/types/auth";

export const useProfile = () => {
  const client = useSupabaseClient();

  const getUserProfile = async (userId: string): Promise<Profile | null> => {
    if (!userId) {
      console.warn("[useProfile] missing userId, skip profile query");
      return null;
    }

    const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      console.error("[useProfile] failed to load profile", {
        userId,
        error,
      });
      return null;
    }

    return data as Profile;
  };

  const getUserRole = async (userId: string): Promise<UserRole | null> => {
    const profile = await getUserProfile(userId);
    return profile?.role ?? null;
  };

  const createProfile = async (
    userId: string,
    role: UserRole,
    data?: Partial<Omit<Profile, "id" | "role">>,
  ) => {
    await client.from("profiles").upsert({
      id: userId,
      role,
      ...data,
    });
  };

  return {
    getUserProfile,
    getUserRole,
    createProfile,
  };
};
