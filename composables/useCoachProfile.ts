import type { CoachProfile, ProfileFormData, SocialLinks } from "../app/types/profile";

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
  bio: profile.bio,
  socialLinks: { ...profile.socialLinks },
});

export const profileFormToPayload = (form: ProfileFormData) => ({
  bio: form.bio.trim(),
  social_links: { ...form.socialLinks },
});

export const useCoachProfile = () => {
  const client = useSupabaseClient();

  const getCoachProfile = async (userId: string): Promise<CoachProfile> => {
    const { data, error } = await (client as any)
      .from("profiles")
      .select("id,bio,social_links")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { error: createError } = await (client as any).from("profiles").upsert({
        id: userId,
        role: "user",
      });

      if (createError) {
        throw createError;
      }

      return {
        id: userId,
        bio: "",
        socialLinks: { ...EMPTY_SOCIAL_LINKS },
      };
    }

    return {
      id: data.id,
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

  return {
    getCoachProfile,
    updateCoachProfile,
  };
};
