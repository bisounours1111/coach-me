import type { CoachProfile, ProfileFieldErrors, ProfileFormData } from "~/types/profile";
import { validateBio, validateGames, validateUrl } from "~/utils/validation";

const emptyFormData = (): ProfileFormData => ({
  games: [{ name: "", rank: "" }],
  bio: "",
  videoUrl: "",
  contact: {},
});

const trimOrEmpty = (value: string | null | undefined) => (value ?? "").trim();
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const toFormData = (profile: CoachProfile | null): ProfileFormData => {
  const games = (profile?.games ?? []).map((name) => ({
    name,
    rank: trimOrEmpty(profile?.ranks?.[name]),
  }));

  return {
    games: games.length ? games : [{ name: "", rank: "" }],
    bio: trimOrEmpty(profile?.bio),
    videoUrl: trimOrEmpty(profile?.video_urls?.[0]),
    contact: profile?.social_links ?? {},
  };
};

const toDbUpdate = (data: ProfileFormData, selectedGameNames: string[]) => {
  const cleanedGames = data.games
    .map((g) => ({ name: g.name.trim(), rank: g.rank.trim() }))
    .filter((g) => g.name.length > 0);

  const games = cleanedGames.map((g) => g.name);
  const ranks = cleanedGames.reduce<Record<string, string>>((acc, g) => {
    if (g.rank) acc[g.name] = g.rank;
    return acc;
  }, {});

  const video_urls = data.videoUrl.trim() ? [data.videoUrl.trim()] : [];

  const social_links = Object.fromEntries(
    Object.entries(data.contact ?? {}).filter(([, v]) => (v ?? "").trim().length > 0),
  );

  return {
    bio: data.bio.trim(),
    games,
    ranks,
    video_urls,
    social_links,
  } as const;
};

export const useCoachProfile = () => {
  const client = useSupabaseClient();

  const loading = ref(false);
  const saving = ref(false);

  const loadError = ref<string | null>(null);
  const saveError = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const formData = ref<ProfileFormData>(emptyFormData());
  const fieldErrors = ref<ProfileFieldErrors>({});

  const getCoachProfile = async (userId: string): Promise<CoachProfile | null> => {
    const { data, error } = await client
      .from("profiles")
      .select("id, bio, games, ranks, social_links, video_urls")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data as CoachProfile;
  };

  const validateProfileData = (data: ProfileFormData) => {
    const nextErrors: ProfileFieldErrors = {};

    const gamesRes = validateGames(data.games);
    if (!gamesRes.ok) nextErrors.games = gamesRes.message ?? "Jeux invalides.";

    const bioRes = validateBio(data.bio);
    if (!bioRes.ok) nextErrors.bio = bioRes.message ?? "Bio invalide.";

    if (!validateUrl(data.videoUrl)) {
      nextErrors.videoUrl = "URL invalide (http/https).";
    }

    const contactEntries = Object.entries(data.contact ?? {});
    for (const [key, raw] of contactEntries) {
      const value = (raw ?? "").trim();
      if (!value) continue;
      if (!validateUrl(value)) {
        const typedKey = key as keyof ProfileFormData["contact"];
        nextErrors[`contact.${typedKey}`] = "URL invalide (http/https).";
      }
    }

    fieldErrors.value = nextErrors;
    return { ok: Object.keys(nextErrors).length === 0, errors: nextErrors };
  };

  const load = async (userId: string) => {
    if (loading.value) return;
    loading.value = true;
    loadError.value = null;
    saveError.value = null;
    successMessage.value = null;

    try {
      const profile = await getCoachProfile(userId);
      formData.value = toFormData(profile);
      fieldErrors.value = {};
    } catch (e: any) {
      loadError.value =
        e?.message || "Impossible de charger ton profil pour le moment.";
    } finally {
      loading.value = false;
    }
  };

  const updateCoachProfile = async (userId: string, data: ProfileFormData) => {
    const validation = validateProfileData(data);
    if (!validation.ok) {
      saveError.value = "Corrige les champs en erreur avant de sauvegarder.";
      return { ok: false as const };
    }

    if (saving.value) return { ok: false as const };
    saving.value = true;
    saveError.value = null;
    successMessage.value = null;

    try {
      const cleanedGames = data.games
        .map((g) => ({ name: g.name.trim(), rank: g.rank.trim() }))
        .filter((g) => g.name.length > 0);

      const selectedGameNames = cleanedGames.map((g) => g.name);
      const gameRows = selectedGameNames.map((name) => ({ slug: slugify(name), name }));

      if (gameRows.length) {
        const { error: gameUpsertError } = await client
          .from("games")
          .upsert(gameRows, { onConflict: "slug" });
        if (gameUpsertError) throw gameUpsertError;
      }

      let selectedGameIds: string[] = [];
      if (selectedGameNames.length) {
        const { data: dbGames, error: gamesFetchError } = await client
          .from("games")
          .select("id, name")
          .in("name", selectedGameNames);
        if (gamesFetchError) throw gamesFetchError;
        selectedGameIds = (dbGames ?? []).map((g: { id: string }) => g.id);

        const rankByGameName = cleanedGames.reduce<Record<string, string>>((acc, g) => {
          if (g.rank) acc[g.name] = g.rank;
          return acc;
        }, {});

        const relations = (dbGames ?? []).map((g: { id: string; name: string }) => ({
          profile_id: userId,
          game_id: g.id,
          is_coach: true,
          player_rank: rankByGameName[g.name] ?? null,
        }));

        const { error: roleUpsertError } = await client
          .from("profile_game_roles")
          .upsert(relations, { onConflict: "profile_id,game_id" });
        if (roleUpsertError) throw roleUpsertError;
      }

      const { data: existingCoachLinks, error: existingLinksError } = await client
        .from("profile_game_roles")
        .select("id, game_id")
        .eq("profile_id", userId)
        .eq("is_coach", true);
      if (existingLinksError) throw existingLinksError;

      const toDelete = (existingCoachLinks ?? [])
        .filter((row: { game_id: string }) => !selectedGameIds.includes(row.game_id))
        .map((row: { id: string }) => row.id);

      if (toDelete.length) {
        const { error: deleteError } = await client
          .from("profile_game_roles")
          .delete()
          .in("id", toDelete);
        if (deleteError) throw deleteError;
      }

      const payload = toDbUpdate(data, selectedGameNames);
      const { error } = await client.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;

      successMessage.value = "Profil mis à jour.";
      return { ok: true as const };
    } catch (e: any) {
      saveError.value = e?.message || "Impossible d'enregistrer. Réessaie plus tard.";
      return { ok: false as const };
    } finally {
      saving.value = false;
    }
  };

  const clearMessages = () => {
    loadError.value = null;
    saveError.value = null;
    successMessage.value = null;
  };

  return {
    loading,
    saving,
    loadError,
    saveError,
    successMessage,
    formData,
    fieldErrors,
    getCoachProfile,
    validateProfileData,
    load,
    updateCoachProfile,
    clearMessages,
  };
};
