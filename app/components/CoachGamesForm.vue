<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-sm font-semibold text-slate-100">Jeux & rangs</h2>
      <p class="mt-1 text-xs text-slate-300/80">
        Selectionne tes jeux, ton rang et indique si tu coaches.
      </p>
    </div>

    <div
      v-if="!games.length"
      class="rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-xs text-slate-200/80"
    >
      Aucun jeu disponible pour le moment.
    </div>
    <div v-else class="grid gap-3">
      <div
        v-for="game in games"
        :key="game.id"
        class="rounded-xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur"
      >
        <div
          class="mb-3 flex items-center justify-between gap-2 text-xs text-slate-200/85"
        >
          <div class="flex items-center gap-3">
            <div
              class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5"
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
                <UIcon name="i-heroicons-puzzle-piece" class="h-5 w-5" />
              </div>
              <div
                v-if="uploadingGameId === game.id"
                class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="h-4 w-4 animate-spin text-teal-400"
                />
              </div>
            </div>
            <div class="flex flex-col">
              <span class="font-semibold text-slate-100">{{ game.name }}</span>
              <div v-if="isMaintainer" class="mt-1 flex gap-2">
                <label
                  class="cursor-pointer text-[0.65rem] text-teal-400 hover:text-teal-300"
                >
                  Modifier l'icône
                  <input
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="handleGameIconUpload(game.id, $event)"
                  />
                </label>
                <button
                  v-if="game.iconUrl"
                  type="button"
                  class="text-[0.65rem] text-rose-400 hover:text-rose-300"
                  @click="removeGameIcon(game.id)"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          <label class="inline-flex items-center gap-2">
            <input
              :checked="roleByGameId[game.id]?.selected"
              type="checkbox"
              class="h-4 w-4 rounded border-white/20 bg-[#0b0f19]/45 text-[#14b8a6] focus:ring-[#14b8a6]/35"
              @change="
                toggleGame(game.id, ($event.target as HTMLInputElement).checked)
              "
            />
            <span class="text-[0.7rem]">Activer</span>
          </label>
        </div>

        <div
          class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          :class="roleByGameId[game.id]?.selected ? '' : 'opacity-50'"
        >
          <div class="space-y-1.5">
            <label
              :for="`rank-${game.id}`"
              class="text-xs font-medium text-slate-200/90"
              >Ton rang</label
            >
            <select
              :id="`rank-${game.id}`"
              :value="roleByGameId[game.id]?.playerRankId ?? ''"
              class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
              :disabled="!roleByGameId[game.id]?.selected"
              @change="
                updateRank(game.id, ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="">Non renseigne</option>
              <option
                v-for="rank in ranksByGameId?.[game.id] ?? []"
                :key="`${game.id}-${rank.id}`"
                :value="rank.id"
              >
                {{ rank.label }}
              </option>
            </select>
          </div>

          <label
            class="inline-flex items-center gap-2 self-end pb-1 text-xs text-slate-200/85"
          >
            <input
              :checked="roleByGameId[game.id]?.isCoach"
              type="checkbox"
              class="h-4 w-4 rounded border-white/20 bg-[#0b0f19]/45 text-[#14b8a6] focus:ring-[#14b8a6]/35"
              :disabled="!roleByGameId[game.id]?.selected"
              @change="
                toggleCoach(
                  game.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            Je suis coach sur ce jeu
          </label>
        </div>
      </div>
    </div>

    <p v-if="errors?.games" class="text-[0.7rem] text-rose-200/90">
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

const roleByGameId = computed<Record<string, CoachGameRole>>(() => {
  const map: Record<string, CoachGameRole> = {};
  for (const role of props.modelValue) map[role.gameId] = role;
  return map;
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
    isCoach: selected ? role.isCoach : false,
    offers: selected ? role.offers : [],
    playerRankId: selected ? role.playerRankId : null,
  }));
};

const toggleCoach = (gameId: string, isCoach: boolean) => {
  updateRole(gameId, (role) => ({
    ...role,
    isCoach,
    offers: isCoach
      ? role.offers.length
        ? role.offers
        : [{ hourlyRate: null, description: "", videoUrls: [], isActive: true }]
      : [],
  }));
};

const updateRank = (gameId: string, playerRankId: string) => {
  updateRole(gameId, (role) => ({
    ...role,
    playerRankId: playerRankId || null,
  }));
};

const { uploadGameIcon, removeGameIcon: removeGameIconApi } = useCoachGames();
const { getIsMaintainer } = useCoachProfile();
const user = useSupabaseUser();
const isMaintainer = ref(false);
const uploadingGameId = ref<string | null>(null);

onMounted(async () => {
  if (user.value) {
    isMaintainer.value = await getIsMaintainer(user.value.id);
  }
});

const handleGameIconUpload = async (gameId: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  if (!file) return;

  try {
    uploadingGameId.value = gameId;
    const publicUrl = await uploadGameIcon(gameId, file);

    // Mettre à jour localement l'icône du jeu dans la liste des jeux passée en prop
    const game = props.games.find((g) => g.id === gameId);
    if (game) {
      game.iconUrl = publicUrl;
    }
  } catch (error) {
    console.error("Erreur lors de l'upload de l'icône :", error);
  } finally {
    uploadingGameId.value = null;
  }
};

const removeGameIcon = async (gameId: string) => {
  if (!confirm("Es-tu sûr de vouloir supprimer cette icône ?")) return;

  try {
    uploadingGameId.value = gameId;
    await removeGameIconApi(gameId);

    // Mettre à jour localement
    const game = props.games.find((g) => g.id === gameId);
    if (game) {
      game.iconUrl = null;
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'icône :", error);
  } finally {
    uploadingGameId.value = null;
  }
};
</script>
