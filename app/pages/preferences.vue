<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-2xl space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">
          Vos préférences
        </h2>
      </div>

      <div
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-10 shadow-xl backdrop-blur-sm"
      >
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center py-12 space-y-4"
        >
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
          ></div>
          <p class="text-sm text-slate-400 font-medium">
            Chargement de vos données...
          </p>
        </div>

        <form v-else class="space-y-10" @submit.prevent="onSave">
          <!-- Section Jeux -->
          <CoachGamesForm
            v-model="gameRoles"
            :games="availableGames"
            :ranks-by-game-id="gameRanksByGameId"
            :errors="fieldErrors"
            @validate="onValidate"
          />

          <!-- Section Offres (visible seulement si au moins un jeu est coché en mode coach) -->
          <div v-if="hasCoachRole" class="pt-8 border-t border-slate-800">
            <CoachCoachingOffersForm
              v-model="gameRoles"
              :errors="fieldErrors"
              :user-id="user?.sub"
              @validate="onValidate"
            />
          </div>

          <!-- Messages d'erreur/succès -->
          <div
            v-if="saveError"
            class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400"
          >
            {{ saveError }}
          </div>

          <div
            v-if="successMessage"
            class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400"
          >
            {{ successMessage }}
          </div>

          <!-- Bouton de validation -->
          <div class="pt-4">
            <button
              type="submit"
              class="flex w-full justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving"
            >
              <span v-if="saving">Enregistrement...</span>
              <span v-else>Terminer la configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CoachGameRole,
  GameOption,
  GameRankOption,
  ProfileFieldErrors,
} from "../types/profile";
import { useCoachGames } from "../composables/useCoachGames";

// Suppression de definePageMeta pour utiliser le layout par défaut
// definePageMeta({ layout: "auth" });

useHead({
  title: "Préférences · CoachMe",
});

const user = useSupabaseUser();
const {
  getAvailableGames,
  getGameRanks,
  getCoachGameRoles,
  upsertCoachGameRoles,
} = useCoachGames();

const loading = ref(true);
const saving = ref(false);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const fieldErrors = ref<ProfileFieldErrors>({});

const availableGames = ref<GameOption[]>([]);
const gameRanksByGameId = ref<Record<string, GameRankOption[]>>({});
const gameRoles = ref<CoachGameRole[]>([]);

const hasCoachRole = computed(() =>
  gameRoles.value.some((role) => role.selected && role.isCoach),
);

const hydrateRoles = (
  games: GameOption[],
  existingRoles: CoachGameRole[],
): CoachGameRole[] => {
  const existingByGameId = new Map(existingRoles.map((r) => [r.gameId, r]));

  return games.map((game) => {
    const existing = existingByGameId.get(game.id);
    return {
      id: existing?.id,
      gameId: game.id,
      gameName: game.name,
      selected: Boolean(existing),
      isCoach: existing?.isCoach ?? false,
      playerRankId: existing?.playerRankId ?? null,
      offers: existing?.offers?.length ? existing.offers : [],
    };
  });
};

const loadData = async () => {
  // On ne charge que si on a un ID et qu'on n'est pas déjà en train de charger
  const userId = user.value?.id || user.value?.sub;
  if (!userId) return;

  // Si on a déjà des jeux chargés, on ne recharge pas (évite la boucle avec le watch)
  if (availableGames.value.length > 0 && gameRoles.value.length > 0) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const [games, ranks, roles] = await Promise.all([
      getAvailableGames(),
      getGameRanks(),
      getCoachGameRoles(userId),
    ]);

    availableGames.value = games;
    gameRanksByGameId.value = ranks;
    gameRoles.value = hydrateRoles(games, roles);
  } catch (e: any) {
    console.error("Erreur lors du chargement des préférences:", e);
    saveError.value = "Impossible de charger vos préférences.";
  } finally {
    loading.value = false;
  }
};

const onValidate = () => {
  saveError.value = null;
  successMessage.value = null;
  fieldErrors.value = {};
};

const onSave = async () => {
  const userId = user.value?.id || user.value?.sub;
  if (saving.value || !userId) return;

  const selectedRoles = gameRoles.value.filter((r) => r.selected);
  if (selectedRoles.length === 0) {
    saveError.value = "Veuillez sélectionner au moins un jeu.";
    return;
  }

  saving.value = true;
  saveError.value = null;

  try {
    await upsertCoachGameRoles(
      userId,
      gameRoles.value
        .filter((r) => r.selected)
        .map((r) => ({
          gameId: r.gameId,
          isCoach: r.isCoach,
          playerRankId: r.playerRankId,
          offers: r.offers,
        })),
    );

    successMessage.value = "Préférences enregistrées avec succès !";

    // Redirection après un court délai
    setTimeout(() => {
      navigateTo("/profile/edit");
    }, 1500);
  } catch (e: any) {
    console.error("Erreur lors de la sauvegarde:", e);
    saveError.value =
      e.message || "Une erreur est survenue lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
};

onMounted(loadData);

// Re-charger les données si l'utilisateur change ou devient disponible
watch(
  () => user.value?.id || user.value?.sub,
  (newId) => {
    if (newId) {
      loadData();
    }
  },
);
</script>
