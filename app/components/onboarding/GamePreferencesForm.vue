<template>
  <form class="space-y-5" @submit.prevent="onSave">
    <p class="text-xs text-slate-200/80">
      Choisis les jeux qui t'intéressent, précise ton rang actuel et indique si tu proposes du coaching sur
      ces jeux. Tu pourras modifier ces préférences plus tard.
    </p>

    <div
      v-if="loadingInitial"
      class="rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-xs text-slate-200/80"
    >
      Chargement des jeux...
    </div>

    <div v-else-if="!preferences.length" class="space-y-2">
      <div class="rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-xs text-slate-200/80">
        Aucun jeu n'est encore disponible.
      </div>
      <p class="text-[0.7rem] text-slate-300/70">
        Demande à un admin d'ajouter les jeux depuis le dashboard admin.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="preference in preferences"
        :key="preference.gameId"
        class="rounded-xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur"
      >
        <div class="mb-3 flex items-center justify-between gap-2 text-xs text-slate-200/80">
          <span class="inline-flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-[#14b8a6]" />
            {{ preference.gameName }}
          </span>
          <label class="inline-flex items-center gap-2">
            <button
              type="button"
              class="relative h-5 w-9 rounded-full border border-white/15 bg-white/5 transition"
              :class="preference.selected ? 'bg-[#14b8a6]/40 border-[#14b8a6]/60' : ''"
              @click="toggleSelected(preference)"
            >
              <span
                class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition"
                :class="preference.selected ? 'right-0.5' : 'left-0.5'"
              />
            </button>
            <span class="text-[0.7rem]">Activer</span>
          </label>
        </div>

        <div class="grid gap-3 sm:grid-cols-2" :class="preference.selected ? '' : 'opacity-55'">
          <div class="space-y-1.5">
            <label
              :for="`game-rank-${preference.gameId}`"
              class="text-xs font-medium text-slate-200/90"
            >
              Rang / Elo (facultatif)
            </label>
            <select
              :id="`game-rank-${preference.gameId}`"
              v-model="preference.playerRankId"
              class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
              :disabled="!preference.selected"
            >
              <option value="">Non renseigné</option>
              <option
                v-for="rank in ranksByGameId[preference.gameId] ?? []"
                :key="`${preference.gameId}-${rank.id}`"
                :value="rank.id"
              >
                {{ rank.label }}
              </option>
            </select>
            <div
              v-if="preference.playerRankId"
              class="mt-1 inline-flex items-center gap-2 text-[0.7rem] text-slate-300/85"
            >
              <img
                v-if="(ranksByGameId[preference.gameId] ?? []).find((r) => r.id === preference.playerRankId)?.icon_url"
                :src="(ranksByGameId[preference.gameId] ?? []).find((r) => r.id === preference.playerRankId)?.icon_url || ''"
                alt="Icône de rang"
                class="h-4 w-4 rounded-sm object-cover"
              />
              <span>Rang sélectionné</span>
            </div>
            <p v-if="!(ranksByGameId[preference.gameId]?.length)" class="text-[0.7rem] text-slate-300/65">
              Aucun rang suggéré pour ce jeu, tu peux laisser vide.
            </p>
          </div>

          <label class="inline-flex items-center gap-2 self-end pb-1 text-xs text-slate-200/85">
            <input
              v-model="preference.isCoach"
              type="checkbox"
              class="h-4 w-4 rounded border-white/20 bg-[#0b0f19]/45 text-[#14b8a6] focus:ring-[#14b8a6]/35"
              :disabled="!preference.selected"
            />
            Je suis coach sur ce jeu
          </label>
        </div>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90"
    >
      {{ successMessage }}
    </div>

    <AuthSubmitButton :loading="loading">
      Enregistrer mes préférences
    </AuthSubmitButton>
  </form>
</template>

<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();

type Game = {
  id: string;
  name: string;
};

type ProfileGameRole = {
  game_id: string;
  is_coach: boolean;
  player_rank_id: string | null;
};

type GameRank = {
  id: string;
  game_id: string;
  label: string;
  icon_url: string | null;
};

type GamePreference = {
  gameId: string;
  gameName: string;
  selected: boolean;
  isCoach: boolean;
  playerRankId: string;
};

const preferences = ref<GamePreference[]>([]);
const ranks = ref<GameRank[]>([]);
const loadingInitial = ref(true);

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const ranksByGameId = computed<Record<string, GameRank[]>>(() => {
  const map: Record<string, GameRank[]> = {};
  for (const rank of ranks.value) {
    const gameRanks = map[rank.game_id] ?? [];
    gameRanks.push(rank);
    map[rank.game_id] = gameRanks;
  }
  return map;
});

const toggleSelected = (preference: GamePreference) => {
  preference.selected = !preference.selected;
  if (!preference.selected) {
    preference.isCoach = false;
  }
};

const loadPreferences = async () => {
  errorMessage.value = null;
  loadingInitial.value = true;

  const currentUser = user.value;
  const [gamesResult, initialRanksResult, profileRolesResult] = await Promise.all([
    (client as any).from("games").select("id,name").order("name", { ascending: true }),
    (client as any)
      .from("game_ranks")
      .select("id,game_id,label,icon_url")
      .order("label", { ascending: true }),
    currentUser
      ? (client as any)
          .from("profile_game_roles")
          .select("game_id,is_coach,player_rank_id")
          .eq("profile_id", currentUser.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (gamesResult.error) {
    errorMessage.value = "Impossible de charger les jeux.";
    loadingInitial.value = false;
    return;
  }

  let ranksResult = initialRanksResult;
  if (
    ranksResult.error &&
    String(ranksResult.error.message ?? "").includes("icon_url")
  ) {
    const fallback = await (client as any)
      .from("game_ranks")
      .select("id,game_id,label")
      .order("label", { ascending: true });

    ranksResult = {
      ...fallback,
      data: ((fallback.data ?? []) as Array<Record<string, any>>).map((rank) => ({
        ...rank,
        icon_url: null,
      })),
    };
  }

  if (ranksResult.error) {
    errorMessage.value = "Jeux chargés, mais impossible de charger les rangs.";
  }

  if (profileRolesResult.error) {
    errorMessage.value = "Impossible de charger tes préférences actuelles.";
    loadingInitial.value = false;
    return;
  }

  const availableGames = (gamesResult.data ?? []) as Game[];
  const existingByGameId = new Map<string, ProfileGameRole>();
  for (const role of (profileRolesResult.data ?? []) as ProfileGameRole[]) {
    existingByGameId.set(role.game_id, role);
  }

  preferences.value = availableGames.map((game) => {
    const existing = existingByGameId.get(game.id);
    return {
      gameId: game.id,
      gameName: game.name,
      selected: Boolean(existing),
      isCoach: existing?.is_coach ?? false,
      playerRankId: existing?.player_rank_id ?? "",
    };
  });

  ranks.value = (ranksResult.data ?? []) as GameRank[];
  loadingInitial.value = false;
};

const onSave = async () => {
  if (loading.value || loadingInitial.value) return;

  errorMessage.value = null;
  successMessage.value = null;

  if (!preferences.value.length) {
    errorMessage.value =
      "Aucun jeu n'est chargé pour le moment. Réessaie un peu plus tard.";
    return;
  }

  const currentUser = user.value;

  if (!currentUser) {
    // Pas de session encore active (email à confirmer, etc.) → on ne tente pas d'enregistrer en base.
    successMessage.value =
      "Préférences enregistrées localement. Elles seront synchronisées quand ta session sera active.";
    return;
  }

  loading.value = true;

  const selectedPreferences = preferences.value.filter((preference) => preference.selected);

  try {
    const { data: existingRows, error: existingRowsError } = await (client as any)
      .from("profile_game_roles")
      .select("game_id")
      .eq("profile_id", currentUser.id);

    if (existingRowsError) {
      throw existingRowsError;
    }

    const existingGameIds = ((existingRows ?? []) as Array<{ game_id: string }>).map((row) => row.game_id);
    const selectedGameIds = selectedPreferences.map((preference) => preference.gameId);
    const toDelete = existingGameIds.filter((gameId) => !selectedGameIds.includes(gameId));

    if (toDelete.length) {
      const { error: deleteError } = await (client as any)
        .from("profile_game_roles")
        .delete()
        .eq("profile_id", currentUser.id)
        .in("game_id", toDelete);

      if (deleteError) {
        throw deleteError;
      }
    }

    if (selectedPreferences.length) {
      const payload = selectedPreferences.map((preference) => ({
        profile_id: currentUser.id,
        game_id: preference.gameId,
        is_coach: preference.isCoach,
        player_rank_id: preference.playerRankId ? preference.playerRankId : null,
      }));

      const { error: upsertError } = await (client as any)
        .from("profile_game_roles")
        .upsert(payload, { onConflict: "profile_id,game_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    successMessage.value = "Préférences mises à jour.";
  } catch {
    errorMessage.value =
      "Impossible d’enregistrer pour le moment. Réessaie plus tard.";
  } finally {
    loading.value = false;
  }
};

await loadPreferences();
</script>

