<template>
  <div class="min-h-screen px-4 py-10">
    <div class="mx-auto w-full max-w-3xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-50">
          Éditer mon profil coach
        </h1>
        <p class="mt-2 text-sm text-slate-300/85">
          Ces informations seront visibles sur ton portfolio.
        </p>
      </div>

      <div
        v-if="loading"
        class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-6 text-sm text-slate-200/80 backdrop-blur"
      >
        Chargement…
      </div>

      <div v-else class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-6 backdrop-blur">
        <form class="space-y-6" @submit.prevent="onSave">
          <CoachProfileForm v-model="profileForm" :errors="fieldErrors" @validate="onValidate" />

          <CoachGamesForm
            v-model="gameRoles"
            :games="availableGames"
            :ranks-by-game-id="gameRanksByGameId"
            :errors="fieldErrors"
            @validate="onValidate"
          />

          <CoachCoachingOffersForm
            v-model="gameRoles"
            :errors="fieldErrors"
            :user-id="activeUserId ?? undefined"
            @validate="onValidate"
          />

          <div
            v-if="saveError"
            class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
          >
            {{ saveError }}
          </div>

          <div
            v-if="successMessage"
            class="rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90"
          >
            {{ successMessage }}
          </div>

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center rounded-xl bg-[#14b8a6] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#14b8a6]/90 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving"
          >
            <span v-if="saving">Enregistrement…</span>
            <span v-else>Enregistrer</span>
          </button>
        </form>

        <div
          v-if="loadError"
          class="mt-4 rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
        >
          {{ loadError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoachGameRole, GameRankOption, ProfileFieldErrors, ProfileFormData } from "../../../types/profile";
import { validateUrl } from "../../../../utils/validation";
import { toProfileFormData, useCoachProfile } from "../../../../composables/useCoachProfile";
import { useCoachGames } from "../../../../composables/useCoachGames";

definePageMeta({
  middleware: ["coach-only"],
});

useHead({
  title: "Profil coach · Édition · CoachMe",
});

const user = useSupabaseUser();
const client = useSupabaseClient();

const { getCoachProfile, updateCoachProfile } = useCoachProfile();
const { getAvailableGames, getGameRanks, getCoachGameRoles, upsertCoachGameRoles } = useCoachGames();

const loading = ref(true);
const saving = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const fieldErrors = ref<ProfileFieldErrors>({});
const availableGames = ref<Array<{ id: string; slug: string; name: string }>>([]);
const gameRanksByGameId = ref<Record<string, GameRankOption[]>>({});
const activeUserId = ref<string | null>(null);

const profileForm = ref<ProfileFormData>({
  bio: "",
  socialLinks: {
    website: "",
    youtube: "",
    twitch: "",
    twitter: "",
    discord: "",
  },
});

const gameRoles = ref<CoachGameRole[]>([]);

const clearMessages = () => {
  saveError.value = null;
  successMessage.value = null;
};

const hydrateRoles = (
  games: Array<{ id: string; name: string }>,
  existingRoles: CoachGameRole[],
): CoachGameRole[] => {
  const existingByGameId = new Map(existingRoles.map((role) => [role.gameId, role]));

  return games.map((game) => {
    const existing = existingByGameId.get(game.id);
    return {
      id: existing?.id,
      gameId: game.id,
      gameName: game.name,
      selected: Boolean(existing),
      isCoach: existing?.isCoach ?? false,
      playerRankId: existing?.playerRankId ?? null,
      offers: existing?.offers?.length
        ? existing.offers
        : existing?.isCoach
          ? [
              {
                hourlyRate: null,
                description: "",
                videoUrls: [],
                isActive: true,
              },
            ]
          : [],
    };
  });
};

const validateForm = (): boolean => {
  const errors: ProfileFieldErrors = {};
  const bio = profileForm.value.bio.trim();
  const selectedRoles = gameRoles.value.filter((role) => role.selected);
  const coachRoles = selectedRoles.filter((role) => role.isCoach);

  if (bio.length > 500) {
    errors.bio = "La bio doit faire au maximum 500 caractères.";
  }

  const socialEntries = Object.entries(profileForm.value.socialLinks) as Array<
    [keyof ProfileFormData["socialLinks"], string]
  >;
  for (const [network, url] of socialEntries) {
    if (url.trim() && !validateUrl(url)) {
      errors[`socialLinks.${String(network)}`] = "URL invalide.";
    }
  }

  if (!selectedRoles.length) {
    errors.games = "Ajoute au moins un jeu à ton profil.";
  }

  for (const role of coachRoles) {
    if (!role.offers.length) {
      errors.offers = "Chaque jeu coaché doit avoir au moins une offre.";
      break;
    }

    for (const offer of role.offers) {
      if (offer.hourlyRate === null || Number.isNaN(Number(offer.hourlyRate)) || Number(offer.hourlyRate) <= 0) {
        errors.offers = "Chaque offre doit avoir un tarif horaire strictement positif.";
        break;
      }

      if (offer.description.trim().length > 1200) {
        errors.offers = "La description d’une offre ne doit pas dépasser 1200 caractères.";
        break;
      }

      for (const url of offer.videoUrls) {
        if (!validateUrl(url)) {
          errors.offers = "Toutes les URLs vidéo des offres doivent être valides.";
          break;
        }
      }

      if (errors.offers) break;
    }

    if (errors.offers) break;
  }

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const load = async (userId: string) => {
  if (!userId || userId === "undefined") {
    loadError.value = "Session invalide: identifiant utilisateur manquant.";
    loading.value = false;
    return;
  }

  loading.value = true;
  loadError.value = null;

  try {
    const [profile, games, ranksByGameId, roles] = await Promise.all([
      getCoachProfile(userId),
      getAvailableGames(),
      getGameRanks(),
      getCoachGameRoles(userId),
    ]);

    profileForm.value = toProfileFormData(profile);
    availableGames.value = games;
    gameRanksByGameId.value = ranksByGameId;
    gameRoles.value = hydrateRoles(games, roles);
  } catch (error: any) {
    const message = String(error?.message ?? "").trim();
    loadError.value = message
      ? `Impossible de charger les données de profil: ${message}`
      : "Impossible de charger les données de profil pour le moment.";
  } finally {
    loading.value = false;
  }
};

const resolveUserId = async (): Promise<string | null> => {
  if (user.value?.id) return user.value.id;
  const authUser = (await client.auth.getUser()).data.user;
  return authUser?.id ?? null;
};

onMounted(async () => {
  const resolvedId = await resolveUserId();
  activeUserId.value = resolvedId;
  if (!resolvedId) {
    loading.value = false;
    loadError.value = "Session utilisateur introuvable.";
    return;
  }
  await load(resolvedId);
});

watch(
  () => user.value?.id,
  async (id) => {
    if (!id) return;
    activeUserId.value = id;
    await load(id);
  },
);

const onValidate = () => {
  clearMessages();
  validateForm();
};

const onSave = async () => {
  if (saving.value) return;

  const id = activeUserId.value ?? (await resolveUserId());
  if (!id) {
    saveError.value = "Impossible d'enregistrer: session utilisateur introuvable.";
    return;
  }
  activeUserId.value = id;

  clearMessages();
  if (!validateForm()) return;

  saving.value = true;
  try {
    await updateCoachProfile(id, profileForm.value);
    await upsertCoachGameRoles(
      id,
      gameRoles.value
        .filter((role) => role.selected)
        .map((role) => ({
          gameId: role.gameId,
          isCoach: role.isCoach,
          playerRankId: role.playerRankId,
          offers: role.offers,
        })),
    );

    // Rehydrate from persisted values to keep IDs and normalized values in sync.
    const [savedProfile, savedRoles] = await Promise.all([getCoachProfile(id), getCoachGameRoles(id)]);
    profileForm.value = toProfileFormData(savedProfile);
    gameRoles.value = hydrateRoles(availableGames.value, savedRoles);
    successMessage.value = "Profil et offres mis à jour.";
  } catch (error: any) {
    const supabaseMessage = String(error?.message ?? "").trim();
    saveError.value = supabaseMessage
      ? `Enregistrement impossible: ${supabaseMessage}`
      : "Enregistrement impossible pour le moment.";
  } finally {
    saving.value = false;
  }
};
</script>
