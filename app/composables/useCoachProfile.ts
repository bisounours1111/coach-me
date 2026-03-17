import type {
  CoachProfile,
  ProfileFormData,
  SocialLinks,
} from "../types/profile";

const EMPTY_SOCIAL_LINKS: SocialLinks = {
  website: "",
  youtube: "",
  twitch: "",
  twitter: "",
  discord: "",
};

const toSocialLinks = (value: unknown): SocialLinks => {
  if (!value || typeof value !== "object") return { ...EMPTY_SOCIAL_LINKS };
  const links = value as Record<string, unknown>;
  return {
    website: String(links.website ?? "").trim(),
    youtube: String(links.youtube ?? "").trim(),
    twitch: String(links.twitch ?? "").trim(),
    twitter: String(links.twitter ?? "").trim(),
    discord: String(links.discord ?? "").trim(),
  };
};

export const toProfileFormData = (profile: CoachProfile): ProfileFormData => ({
  fullName: profile.fullName,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio,
  socialLinks: { ...profile.socialLinks },
});

export const profileFormToPayload = (form: ProfileFormData) => ({
  full_name: form.fullName.trim(),
  avatar_url: form.avatarUrl.trim(),
  bio: form.bio.trim(),
  social_links: { ...form.socialLinks },
});

export const useCoachProfile = () => {
  const client = useSupabaseClient();

  const getCoachProfile = async (userId: string): Promise<CoachProfile> => {
    const { data, error } = await (client as any)
      .from("profiles")
      .select("id,full_name,avatar_url,bio,social_links")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { error: createError } = await (client as any)
        .from("profiles")
        .upsert({
          id: userId,
          role: "user",
        });

      if (createError) {
        throw createError;
      }

      return {
        id: userId,
        fullName: "",
        avatarUrl: "",
        bio: "",
        socialLinks: { ...EMPTY_SOCIAL_LINKS },
      };
    }

    return {
      id: data.id,
      fullName: String(data.full_name ?? ""),
      avatarUrl: String(data.avatar_url ?? ""),
      bio: String(data.bio ?? ""),
      socialLinks: toSocialLinks(data.social_links),
    };
  };

  const updateCoachProfile = async (userId: string, data: ProfileFormData) => {
    const payload = profileFormToPayload(data);
    const { error } = await (client as any).from("profiles").upsert({
      id: userId,
      ...payload,
    });

    if (error) {
      throw error;
    }
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string> => {
    const date = new Date().toISOString().split("T")[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `pp/${userId}_${date}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // 1. Upload du fichier
    const { data: uploadData, error: uploadError } = await client.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // 2. Récupération de l'URL publique
    const { data: publicUrlData } = client.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  const getCoachPublicData = async (userId: string) => {
    const { data, error } = await (client as any)
      .from("profiles")
      .select(`
        id,
        full_name,
        avatar_url,
        bio,
        social_links,
        is_coach,
        profile_game_roles (
          id,
          game_id,
          role,
          games (
            id,
            name,
            image_url
          ),
          game_ranks (
            id,
            name,
            icon_url
          )
        )
      `)
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Récupérer les stats séparément via les fonctions RPC
    const { data: avgRating } = await (client as any).rpc('get_coach_average_rating', { coach_uuid: userId });
    const { data: reviewCount } = await (client as any).rpc('get_coach_review_count', { coach_uuid: userId });

    return {
      ...data,
      average_rating: avgRating || 0,
      review_count: reviewCount || 0
    };
  };

  return {
    getCoachProfile,
    getCoachPublicData,
    updateCoachProfile,
    uploadAvatar,
  };
};
