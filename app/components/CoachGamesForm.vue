<template>
  <section class="space-y-8">
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="flex-1">
          <h2
            class="text-sm font-semibold text-slate-100 italic flex items-center gap-2"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full bg-[#14b8a6] text-[10px] text-slate-950 font-bold"
              >1</span
            >
            Sélectionne tes jeux
          </h2>
          <p class="mt-1 text-xs text-slate-300/80">
            Choisis les jeux auxquels tu joues pour les afficher sur ton profil.
          </p>
        </div>

        <div class="relative w-full sm:w-64">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un jeu..."
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 pl-9 pr-4 py-2 text-xs text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
          />
        </div>
      </div>

      <div
        v-if="!filteredGames.length"
        class="rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-8 text-center text-xs text-slate-400"
      >
        {{
          searchQuery
            ? "Aucun jeu ne correspond à ta recherche."
            : "Aucun jeu disponible."
        }}
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <button
          v-for="game in filteredGames"
          :key="game.id"
          type="button"
          class="group relative flex flex-col items-center gap-3 rounded-2xl border p-3 transition-all duration-200"
          :class="[
            roleByGameId[game.id]?.selected
              ? 'border-[#14b8a6] bg-[#14b8a6]/5 ring-1 ring-[#14b8a6]/20'
              : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]',
          ]"
          @click="toggleGame(game.id, !roleByGameId[game.id]?.selected)"
        >
          <div
            class="absolute top-2 right-2 h-5 w-5 rounded-full border flex items-center justify-center transition-colors"
            :class="[
              roleByGameId[game.id]?.selected
                ? 'bg-[#14b8a6] border-[#14b8a6] text-slate-950'
                : 'bg-black/20 border-white/10 text-transparent',
            ]"
          >
            <UIcon name="i-heroicons-check" class="h-3 w-3 font-bold" />
          </div>

          <div
            class="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg group-hover:scale-105 transition-transform"
          >
            <img
              v-if="game.iconUrl"
              :src="game.iconUrl"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-slate-500"
            >
              <UIcon name="i-heroicons-puzzle-piece" class="h-8 w-8" />
            </div>
          </div>

          <span
            class="text-[0.7rem] font-medium text-center line-clamp-1"
            :class="
              roleByGameId[game.id]?.selected
                ? 'text-[#14b8a6]'
                : 'text-slate-300'
            "
          >
            {{ game.name }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="selectedGames.length > 0"
      class="space-y-4 pt-6 border-t border-white/5"
    >
      <div class="flex items-center gap-2">
        <h2
          class="text-sm font-semibold text-slate-100 italic flex items-center gap-2"
        >
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full bg-[#14b8a6] text-[10px] text-slate-950 font-bold"
            >2</span
          >
          Indique ton niveau
        </h2>
      </div>

      <div class="grid gap-4">
        <div
          v-for="game in selectedGames"
          :key="`config-${game.id}`"
          class="rounded-2xl border border-white/10 bg-[#0b0f19]/60 p-5 backdrop-blur-md flex flex-col sm:flex-row gap-6 items-start sm:items-center"
        >
          <div class="flex items-center gap-4 min-w-[180px]">
            <div
              class="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5"
            >
              <img
                v-if="game.iconUrl"
                :src="game.iconUrl"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-slate-500"
              >
                <UIcon name="i-heroicons-puzzle-piece" class="h-6 w-6" />
              </div>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-50">{{
                game.name
              }}</span>
              <button
                type="button"
                class="text-[10px] text-rose-400 hover:text-rose-300 text-left mt-0.5"
                @click="toggleGame(game.id, false)"
              >
                Retirer
              </button>
            </div>
          </div>

          <div class="flex-1 w-full">
            <div class="space-y-1.5">
              <label
                :for="`rank-${game.id}`"
                class="text-[10px] uppercase tracking-wider font-bold text-slate-400"
              >
                Ton rang actuel
              </label>
              <div class="relative flex items-center">
                <div
                  v-if="roleByGameId[game.id]?.playerRankId"
                  class="absolute left-3 z-10 flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-white/5"
                >
                  <img
                    v-if="ranksByGameId?.[game.id]?.find(r => r.id === roleByGameId[game.id].playerRankId)?.iconUrl"
                    :src="ranksByGameId[game.id].find(r => r.id === roleByGameId[game.id].playerRankId)!.iconUrl!"
                    class="h-full w-full object-contain"
                    :key="roleByGameId[game.id].playerRankId"
                  />
                  <UIcon v-else name="i-heroicons-trophy" class="h-4 w-4 text-slate-500" />
                </div>
                <select
                  :id="`rank-${game.id}`"
                  :value="roleByGameId[game.id]?.playerRankId ?? ''"
                  class="w-full rounded-xl border border-white/10 bg-[#0b0f19] py-2.5 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50 appearance-none"
                  :class="roleByGameId[game.id]?.playerRankId ? 'pl-11 pr-4' : 'px-4'"
                  @change="
                    updateRank(
                      game.id,
                      ($event.target as any).value,
                    )
                  "
                >
                  <option value="" class="bg-[#0b0f19] text-slate-50">
                    Non renseigné
                  </option>
                  <option
                    v-for="rank in ranksByGameId?.[game.id] ?? []"
                    :key="`${game.id}-${rank.id}`"
                    :value="rank.id"
                    class="bg-[#0b0f19] text-slate-50"
                  >
                    {{ rank.label }}
                  </option>
                </select>
                <div class="pointer-events-none absolute right-3 flex items-center">
                  <UIcon name="i-heroicons-chevron-down" class="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="errors?.games"
      class="text-[0.7rem] text-rose-400 font-medium bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
    >
      {{ errors.games }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type {
  CoachGameRole,
  GameOption,
  GameRankOption,
  ProfileFieldErrors,
} from "../types/profile";

const props = withDefaults(
  defineProps<{
    modelValue: CoachGameRole[];
    games: GameOption[];
    ranksByGameId?: Record<string, GameRankOption[]>;
    errors?: ProfileFieldErrors;
  }>(),
  { errors: () => ({}), ranksByGameId: () => ({}) },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: CoachGameRole[]): void;
  (e: "validate"): void;
}>();

const searchQuery = ref("");

const filteredGames = computed(() => {
  if (!searchQuery.value.trim()) return props.games;
  const query = searchQuery.value.toLowerCase().trim();
  return props.games.filter((game) => game.name.toLowerCase().includes(query));
});

const roleByGameId = computed<Record<string, CoachGameRole>>(() => {
  const map: Record<string, CoachGameRole> = {};
  for (const role of props.modelValue) map[role.gameId] = role;
  return map;
});

const selectedGames = computed(() => {
  return props.games.filter((game) => roleByGameId.value[game.id]?.selected);
});

const updateRole = (
  gameId: string,
  updater: (value: CoachGameRole) => CoachGameRole,
) => {
  const next = props.modelValue.map((role) =>
    role.gameId === gameId ? updater(role) : role,
  );
  emit("update:modelValue", next);
  emit("validate");
};

const toggleGame = (gameId: string, selected: boolean) => {
  updateRole(gameId, (role) => ({
    ...role,
    selected,
    // On ne touche pas à isCoach ici pour préserver l'état si l'utilisateur désélectionne/resélectionne
    // Mais on nettoie les offres si désélectionné
    offers: selected ? role.offers : [],
    playerRankId: selected ? role.playerRankId : null,
  }));
};

const updateRank = (gameId: string, playerRankId: string) => {
  updateRole(gameId, (role) => ({
    ...role,
    playerRankId: playerRankId || null,
  }));
};

const { uploadGameIcon, removeGameIcon: removeGameIconApi } = useCoachGames();
const uploadingGameId = ref<string | null>(null);
</script>
