import type { Profile, UserRole } from "../types/auth";

export const useProfile = () => {
  const client = useSupabaseClient();
  const user = useSupabaseUser();

  const getUserProfile = async (userId?: string): Promise<Profile | null> => {
    // Récupération de l'ID (paramètre > session Nuxt > session Supabase directe)
    let id = userId || user.value?.id;
    
    if (!id) {
      const { data } = await client.auth.getUser();
      id = data.user?.id;
    }
    
    if (!id) {
      console.warn("[useProfile] Impossible de récupérer un ID utilisateur (session manquante)");
      return null;
    }

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[useProfile] Erreur lors du chargement du profil:", { id, error });
      return null;
    }

    return data as Profile;
  };

  const getUserRole = async (userId?: string): Promise<UserRole | null> => {
    const profile = await getUserProfile(userId);
    return profile?.role ?? null;
  };

  const createProfile = async (
    userId: string,
    role: UserRole,
    data?: Partial<Omit<Profile, "id" | "role">>,
  ) => {
    await (client as any).from("profiles").upsert({
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
