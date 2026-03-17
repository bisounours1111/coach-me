type PublicProfileBase = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string;
  socialLinks: Record<string, string>;
};

export type PublicProfileGame = {
  profileGameRoleId: string;
  gameId: string;
  gameName: string;
  gameIconUrl: string | null;
  isCoach: boolean;
  playerRankLabel: string | null;
};

export type PublicCoachingOffer = {
  id: string;
  profileGameRoleId: string;
  description: string;
  hourlyRate: number | null;
  videoUrls: string[];
  isActive: boolean;
};

export type PublicProfileView = PublicProfileBase & {
  games: PublicProfileGame[];
  offersByRoleId: Record<string, PublicCoachingOffer[]>;
  hasFutureAvailabilities: boolean;
};

const toStringRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => [key, String(val ?? "").trim()] as const)
    .filter(([, val]) => Boolean(val));
  return Object.fromEntries(entries);
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
};

export const usePublicProfile = () => {
  const client = useSupabaseClient();

  const getPublicProfile = async (
    profileId: string,
  ): Promise<PublicProfileView | null> => {
    const { data: profileRow, error: profileError } = await (client as any)
      .from("profiles")
      .select("id,full_name,avatar_url,bio,social_links,coach_availabilities(id, start_at)")
      .eq("id", profileId)
      .gt("coach_availabilities.start_at", new Date().toISOString())
      .eq("coach_availabilities.status", "available")
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profileRow) return null;

    const { data: roleRows, error: rolesError } = await (client as any)
      .from("profile_game_roles")
      .select("id,game_id,is_coach,player_rank_id,games(name,icon_url)")
      .eq("profile_id", profileId);
    if (rolesError) throw rolesError;

    const rawRoles = (roleRows ?? []) as Array<Record<string, any>>;
    const rankIds = rawRoles
      .map((row) => row.player_rank_id)
      .filter((id) => Boolean(id)) as string[];

    let rankLabelById = new Map<string, string>();
    if (rankIds.length) {
      const { data: rankRows, error: ranksError } = await (client as any)
        .from("game_ranks")
        .select("id,label")
        .in("id", rankIds);
      if (ranksError) throw ranksError;
      rankLabelById = new Map(
        ((rankRows ?? []) as Array<{ id: string; label: string }>).map(
          (rank) => [rank.id, rank.label],
        ),
      );
    }

    const games: PublicProfileGame[] = rawRoles.map((row) => ({
      profileGameRoleId: String(row.id),
      gameId: String(row.game_id),
      gameName: String(row.games?.name ?? "Jeu"),
      gameIconUrl: row.games?.icon_url ? String(row.games.icon_url) : null,
      isCoach: Boolean(row.is_coach),
      playerRankLabel: row.player_rank_id
        ? (rankLabelById.get(String(row.player_rank_id)) ?? null)
        : null,
    }));

    const roleIds = games.map((game) => game.profileGameRoleId);
    let offersByRoleId: Record<string, PublicCoachingOffer[]> = {};
    if (roleIds.length) {
      const { data: offerRows, error: offersError } = await (client as any)
        .from("coachings")
        .select(
          "id,profile_game_role_id,description,hourly_rate,video_urls,is_active",
        )
        .in("profile_game_role_id", roleIds)
        .eq("is_active", true);
      if (offersError) throw offersError;

      for (const row of (offerRows ?? []) as Array<Record<string, any>>) {
        const roleId = String(row.profile_game_role_id);
        const current = offersByRoleId[roleId] ?? [];
        current.push({
          id: String(row.id),
          profileGameRoleId: roleId,
          description: String(row.description ?? ""),
          hourlyRate:
            row.hourly_rate === null || row.hourly_rate === undefined
              ? null
              : Number(row.hourly_rate),
          videoUrls: toStringArray(row.video_urls),
          isActive: row.is_active !== false,
        });
        offersByRoleId[roleId] = current;
      }
    }

    return {
      id: String(profileRow.id),
      fullName: String(profileRow.full_name ?? "Profil joueur"),
      avatarUrl: profileRow.avatar_url ? String(profileRow.avatar_url) : null,
      bio: String(profileRow.bio ?? ""),
      socialLinks: toStringRecord(profileRow.social_links),
      games,
      offersByRoleId,
      hasFutureAvailabilities: (profileRow.coach_availabilities?.length ?? 0) > 0,
    };
  };

  return {
    getPublicProfile,
  };
};
