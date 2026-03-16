import type { CoachFilters, CoachGameInfo, CoachSearchResult } from "~/types/coach";

const MAX_BIO_LENGTH = 140;

const truncate = (value: string | null | undefined, max = MAX_BIO_LENGTH): string | null => {
  if (!value) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

export const useCoaches = () => {
  const client = useSupabaseClient();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const results = ref<CoachSearchResult[]>([]);

  const filters = ref<CoachFilters>({
    gameSlug: null,
    searchText: "",
  });

  const setGameFilter = (slug: string | null) => {
    filters.value.gameSlug = slug;
    void loadCoaches();
  };

  const setSearchText = (value: string) => {
    filters.value.searchText = value;
  };

  const loadCoaches = async () => {
    error.value = null;

    if (!filters.value.gameSlug) {
      results.value = [];
      return;
    }

    loading.value = true;

    const { data: gameRow, error: gameError } = await (client as any)
      .from("games")
      .select("id")
      .eq("slug", filters.value.gameSlug)
      .maybeSingle();

    if (gameError || !gameRow?.id) {
      loading.value = false;
      error.value = "Jeu introuvable.";
      results.value = [];
      return;
    }

    const gameId = gameRow.id;

    const { data, error: queryError } = await (client as any)
      .from("profile_game_roles")
      .select(
        "id, is_coach, player_rank_id, profiles(id, full_name, avatar_url, bio), games(id, slug, name), coachings(id, hourly_rate, is_active)",
      )
      .eq("is_coach", true)
      .eq("game_id", gameId);

    loading.value = false;

    if (queryError) {
      console.error(queryError);
      error.value = "Impossible de charger les coachs pour le moment.";
      results.value = [];
      return;
    }

    type Row = {
      profiles: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null } | null;
      games: { id: string; slug: string; name: string } | null;
      player_rank_id: string | null;
      coachings: Array<{ id: string; hourly_rate: number | null; is_active: boolean }> | null;
    };

    const rawRows = (data ?? []) as Row[];

    const byProfile = new Map<string, CoachSearchResult>();

    for (const row of rawRows) {
      const profile = row.profiles;
      const game = row.games;
      if (!profile || !game) continue;

      const profileId = profile.id;
      const existing = byProfile.get(profileId);

      const activeCoaching =
        row.coachings?.find((c) => c.is_active && c.hourly_rate != null) ?? row.coachings?.[0] ?? null;

      const gameInfo: CoachGameInfo = {
        gameId: game.id,
        gameSlug: game.slug,
        gameName: game.name,
        isCoach: true,
        playerRank: null,
        hourlyRate: activeCoaching?.hourly_rate ?? null,
      };

      if (!existing) {
        byProfile.set(profileId, {
          profileId,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          bio: truncate(profile.bio),
          games: [gameInfo],
        });
      } else {
        existing.games.push(gameInfo);
      }
    }

    let list = Array.from(byProfile.values());

    const search = filters.value.searchText.trim().toLowerCase();
    if (search) {
      list = list.filter((coach) => {
        const inName = coach.fullName?.toLowerCase().includes(search) ?? false;
        const inBio = coach.bio?.toLowerCase().includes(search) ?? false;
        return inName || inBio;
      });
    }

    results.value = list;
  };

  return {
    loading,
    error,
    results,
    filters,
    loadCoaches,
    setGameFilter,
    setSearchText,
  };
};
