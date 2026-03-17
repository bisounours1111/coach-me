import type {
  CoachGameRole,
  CoachGameRolePayload,
  CoachingOffer,
  GameOption,
  GameRankOption,
} from "../app/types/profile";

type ProfileGameRoleRow = {
  id: string;
  game_id: string;
  is_coach: boolean;
  player_rank_id: string | null;
  games: { id: string; name: string } | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return UUID_REGEX.test(raw) ? raw : null;
};

const sanitizeOffers = (offers: CoachingOffer[]): CoachingOffer[] =>
  offers
    .map((offer) => ({
      ...offer,
      hourlyRate:
        offer.hourlyRate === null || Number.isNaN(Number(offer.hourlyRate))
          ? null
          : Number(offer.hourlyRate),
      description: String(offer.description ?? "").trim(),
      videoUrls: (offer.videoUrls ?? [])
        .map((url) => url.trim())
        .filter(Boolean),
      isActive: offer.isActive !== false,
    }))
    .filter(
      (offer) =>
        offer.hourlyRate !== null ||
        offer.description ||
        offer.videoUrls.length > 0,
    );

const defaultOffer = (): CoachingOffer => ({
  hourlyRate: null,
  description: "",
  videoUrls: [],
  isActive: true,
});

export const useCoachGames = () => {
  const client = useSupabaseClient();

  const getAvailableGames = async (): Promise<GameOption[]> => {
    const { data, error } = await (client as any)
      .from("games")
      .select("id,slug,name,icon_url")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((game: any) => ({
      id: game.id,
      slug: game.slug,
      name: game.name,
      iconUrl: game.icon_url,
    })) as GameOption[];
  };

  const getCoachGameRoles = async (
    userId: string,
  ): Promise<CoachGameRole[]> => {
    const { data: roleRows, error: rolesError } = await (client as any)
      .from("profile_game_roles")
      .select("id,game_id,is_coach,player_rank_id,games(id,name)")
      .eq("profile_id", userId);
    if (rolesError) throw rolesError;

    const rows = (roleRows ?? []) as ProfileGameRoleRow[];
    const rankIds = rows
      .map((row) => normalizeUuid(row.player_rank_id))
      .filter((id): id is string => Boolean(id));

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

    const roles = rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      gameName: row.games?.name ?? "Jeu",
      selected: true,
      isCoach: row.is_coach,
      playerRankId: normalizeUuid(row.player_rank_id),
      playerRankLabel: normalizeUuid(row.player_rank_id)
        ? (rankLabelById.get(String(row.player_rank_id)) ?? "")
        : "",
      offers: [] as CoachingOffer[],
    }));

    const roleIds = roles.map((role) => role.id).filter(Boolean) as string[];
    if (!roleIds.length) return roles;

    const { data: coachingRows, error: coachingsError } = await (client as any)
      .from("coachings")
      .select(
        "id,profile_game_role_id,description,video_urls,hourly_rate,is_active",
      )
      .in("profile_game_role_id", roleIds);
    if (coachingsError) throw coachingsError;

    const offersByRoleId = new Map<string, CoachingOffer[]>();
    for (const row of (coachingRows ?? []) as Array<Record<string, any>>) {
      const roleId = String(row.profile_game_role_id);
      const offers = offersByRoleId.get(roleId) ?? [];
      offers.push({
        id: String(row.id),
        profileGameRoleId: roleId,
        hourlyRate:
          row.hourly_rate === null || row.hourly_rate === undefined
            ? null
            : Number(row.hourly_rate),
        description: String(row.description ?? ""),
        videoUrls: Array.isArray(row.video_urls)
          ? row.video_urls
              .map((url: unknown) => String(url ?? "").trim())
              .filter(Boolean)
          : [],
        isActive: row.is_active !== false,
      });
      offersByRoleId.set(roleId, offers);
    }

    return roles.map((role) => ({
      ...role,
      offers: offersByRoleId.get(role.id ?? "") ?? [],
    }));
  };

  const getGameRanks = async (): Promise<Record<string, GameRankOption[]>> => {
    const { data, error } = await (client as any)
      .from("game_ranks")
      .select("id,game_id,label,icon_url")
      .order("label", { ascending: true });
    if (error) throw error;

    const grouped: Record<string, GameRankOption[]> = {};
    for (const row of (data ?? []) as Array<Record<string, any>>) {
      const gameId = String(row.game_id);
      const gameRanks = grouped[gameId] ?? [];
      gameRanks.push({
        id: String(row.id),
        gameId,
        label: String(row.label ?? ""),
        iconUrl: row.icon_url ? String(row.icon_url) : null,
      });
      grouped[gameId] = gameRanks;
    }
    return grouped;
  };

  const upsertCoachGameRoles = async (
    userId: string,
    payload: CoachGameRolePayload[],
  ) => {
    const selectedRoles = payload.map((role) => ({
      gameId: role.gameId,
      isCoach: role.isCoach,
      playerRankId: normalizeUuid(role.playerRankId),
      offers: role.isCoach ? sanitizeOffers(role.offers) : [],
    }));
    const selectedGameIds = selectedRoles.map((role) => role.gameId);

    const { data: existingRows, error: existingError } = await (client as any)
      .from("profile_game_roles")
      .select("id,game_id")
      .eq("profile_id", userId);
    if (existingError) throw existingError;

    const existingGameIds = (
      (existingRows ?? []) as Array<{ game_id: string }>
    ).map((row) => row.game_id);
    const toDelete = existingGameIds.filter(
      (gameId) => !selectedGameIds.includes(gameId),
    );
    if (toDelete.length) {
      const { error } = await (client as any)
        .from("profile_game_roles")
        .update({ is_coach: false })
        .eq("profile_id", userId)
        .in("game_id", toDelete);
      if (error) throw error;
    }

    if (!selectedRoles.length) return;

    const { data: upsertedRows, error: upsertError } = await (client as any)
      .from("profile_game_roles")
      .upsert(
        selectedRoles.map((role) => ({
          profile_id: userId,
          game_id: role.gameId,
          is_coach: role.isCoach,
          player_rank_id: normalizeUuid(role.playerRankId),
        })),
        { onConflict: "profile_id,game_id" },
      )
      .select("id,game_id,is_coach");
    if (upsertError) throw upsertError;

    for (const role of (upsertedRows ?? []) as Array<{
      id: string;
      game_id: string;
      is_coach: boolean;
    }>) {
      const source = selectedRoles.find((item) => item.gameId === role.game_id);
      if (!source) continue;

      const { data: existingOffers, error: existingOffersError } = await (
        client as any
      )
        .from("coachings")
        .select("id")
        .eq("profile_game_role_id", role.id);
      if (existingOffersError) throw existingOffersError;

      const existingOfferIds = new Set(
        ((existingOffers ?? []) as Array<{ id: string }>).map((o) =>
          String(o.id),
        ),
      );

      if (!role.is_coach) {
        if (existingOfferIds.size) {
          const { error: disableError } = await (client as any)
            .from("coachings")
            .update({ is_active: false })
            .eq("profile_game_role_id", role.id);
          if (disableError) throw disableError;
        }
        continue;
      }

      const offers = source.offers.length ? source.offers : [defaultOffer()];
      const incomingOfferIds = new Set(
        offers
          .map((offer) => normalizeUuid((offer as any).id))
          .filter((id): id is string => Boolean(id)),
      );

      // Désactiver les offres retirées
      const toDisable = Array.from(existingOfferIds).filter(
        (id) => !incomingOfferIds.has(id),
      );
      if (toDisable.length) {
        const { error: disableError } = await (client as any)
          .from("coachings")
          .update({ is_active: false })
          .in("id", toDisable);
        if (disableError) throw disableError;
      }

      // Update des offres existantes (celles qui ont un id)
      for (const offer of offers) {
        const offerId = normalizeUuid((offer as any).id);
        const payload = {
          profile_game_role_id: role.id,
          description: offer.description.trim() || null,
          video_urls: offer.videoUrls.length ? offer.videoUrls : null,
          hourly_rate: offer.hourlyRate,
          is_active: offer.isActive !== false,
        };

        if (offerId) {
          const { error: updateError } = await (client as any)
            .from("coachings")
            .update(payload)
            .eq("id", offerId);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await (client as any)
            .from("coachings")
            .insert(payload);
          if (insertError) throw insertError;
        }
      }
    }
  };

  const uploadGameIcon = async (
    gameId: string,
    file: File,
  ): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${gameId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `icons/${fileName}`;

    const { error: uploadError } = await (client as any).storage
      .from("game-icons")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = (client as any).storage.from("game-icons").getPublicUrl(filePath);

    const { error: updateError } = await (client as any)
      .from("games")
      .update({ icon_url: publicUrl })
      .eq("id", gameId);

    if (updateError) throw updateError;

    return publicUrl;
  };

  const removeGameIcon = async (gameId: string) => {
    const { data: game, error: fetchError } = await (client as any)
      .from("games")
      .select("icon_url")
      .eq("id", gameId)
      .single();

    if (fetchError) throw fetchError;

    if (game?.icon_url) {
      const urlParts = game.icon_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `icons/${fileName}`;

      await (client as any).storage.from("game-icons").remove([filePath]);
    }

    const { error: updateError } = await (client as any)
      .from("games")
      .update({ icon_url: null })
      .eq("id", gameId);

    if (updateError) throw updateError;
  };

  return {
    getAvailableGames,
    getGameRanks,
    getCoachGameRoles,
    upsertCoachGameRoles,
    uploadGameIcon,
    removeGameIcon,
  };
};
