<template>
  <div class="min-h-screen px-4 py-10">
    <div class="mx-auto w-full max-w-5xl">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-50">
          Paramètres du compte
        </h1>
        <p class="mt-2 text-sm text-slate-400">
          Gère ton profil, tes jeux et tes offres de coaching.
        </p>
      </div>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar Navigation -->
        <aside class="w-full lg:w-64 shrink-0">
          <nav class="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap"
              :class="[
                activeTab === tab.id
                  ? 'bg-[#14b8a6]/10 text-[#14b8a6] ring-1 ring-[#14b8a6]/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              ]"
              @click="activeTab = tab.id"
            >
              <UIcon :name="tab.icon" class="h-5 w-5" />
              {{ tab.label }}
            </button>
          </nav>
        </aside>

        <!-- Main Content Area -->
        <div class="flex-1 min-w-0">
          <div class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-6 backdrop-blur-md shadow-xl">
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
              <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-[#14b8a6]" />
              <p class="text-sm text-slate-400">Chargement de tes informations...</p>
            </div>

            <div v-else>
              <!-- Tab: Profile -->
              <div v-show="activeTab === 'profile'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="mb-6">
                  <h2 class="text-xl font-semibold text-slate-50">Profil public</h2>
                  <p class="text-sm text-slate-400">Ces informations seront visibles sur ton portfolio public.</p>
                </div>
                <form @submit.prevent="onSave">
                  <CoachProfileForm
                    v-model="profileForm"
                    :errors="fieldErrors"
                    :user-id="activeUserId ?? undefined"
                    @validate="onValidate"
                  />
                  <div class="mt-8 pt-6 border-t border-white/10">
                    <button type="submit" :disabled="saving" class="w-full lg:w-auto px-6 py-3 bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-slate-950 rounded-xl font-bold transition disabled:opacity-50">
                      {{ saving ? 'Enregistrement...' : 'Enregistrer le profil' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- Tab: Security -->
              <div v-show="activeTab === 'security'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="mb-6">
                  <h2 class="text-xl font-semibold text-slate-50">Sécurité</h2>
                  <p class="text-sm text-slate-400">Gère tes identifiants de connexion.</p>
                </div>
                
                <!-- Change Email -->
                <div class="space-y-4">
                  <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider">Changer l'adresse email</h3>
                  <div class="grid gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs text-slate-400">Email actuel</label>
                      <input :value="user?.email" disabled class="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs text-slate-400">Nouvel email</label>
                      <input v-model="securityForm.newEmail" type="email" placeholder="nouveau@email.com" class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-[#14b8a6]/50" />
                    </div>
                    <button @click="updateEmail" :disabled="securityLoading" class="w-full lg:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                      Mettre à jour l'email
                    </button>
                  </div>
                </div>

                <!-- Change Password -->
                <div class="space-y-4 pt-8 border-t border-white/5">
                  <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider">Changer le mot de passe</h3>
                  <div class="grid gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs text-slate-400">Mot de passe actuel</label>
                      <input v-model="securityForm.currentPassword" type="password" placeholder="••••••••" class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-[#14b8a6]/50" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs text-slate-400">Nouveau mot de passe</label>
                      <input v-model="securityForm.newPassword" type="password" placeholder="••••••••" class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-[#14b8a6]/50" />
                    </div>
                    <div class="space-y-1.5">
                      <label class="text-xs text-slate-400">Confirmer le nouveau mot de passe</label>
                      <input v-model="securityForm.confirmPassword" type="password" placeholder="••••••••" class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-[#14b8a6]/50" />
                    </div>
                    <button @click="updatePassword" :disabled="securityLoading" class="w-full lg:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                      Mettre à jour le mot de passe
                    </button>
                  </div>
                </div>

                <div v-if="securityMessage" :class="securityMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'" class="rounded-xl border px-4 py-3 text-xs">
                  {{ securityMessage.text }}
                </div>
              </div>

              <!-- Tab: Games -->
              <div v-show="activeTab === 'games'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="mb-6">
                  <h2 class="text-xl font-semibold text-slate-50">Mes jeux</h2>
                  <p class="text-sm text-slate-400">Sélectionne les jeux auxquels tu joues et ton niveau.</p>
                </div>
                <form @submit.prevent="onSave">
                  <CoachGamesForm
                    v-model="gameRoles"
                    :games="availableGames"
                    :ranks-by-game-id="gameRanksByGameId"
                    :errors="fieldErrors"
                    @validate="onValidate"
                  />
                  <div class="mt-8 pt-6 border-t border-white/10">
                    <button type="submit" :disabled="saving" class="w-full lg:w-auto px-6 py-3 bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-slate-950 rounded-xl font-bold transition disabled:opacity-50">
                      {{ saving ? 'Enregistrement...' : 'Enregistrer mes jeux' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- Tab: Coaching -->
              <div v-show="activeTab === 'coaching'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="mb-6">
                  <h2 class="text-xl font-semibold text-slate-50">Coaching</h2>
                  <p class="text-sm text-slate-400">Configure tes offres et tes disponibilités pour les élèves.</p>
                </div>
                
                <form @submit.prevent="onSave">
                  <div class="space-y-10">
                    <CoachCoachingOffersForm
                      v-model="gameRoles"
                      :games="availableGames"
                      :errors="fieldErrors"
                      :user-id="activeUserId ?? undefined"
                      @validate="onValidate"
                    />

                    <div v-if="isCoach" class="pt-8 border-t border-white/10">
                      <CoachAvailabilityForm
                        v-if="activeUserId"
                        :user-id="activeUserId"
                      />
                    </div>
                  </div>
                  <div class="mt-8 pt-6 border-t border-white/10">
                    <button type="submit" :disabled="saving" class="w-full lg:w-auto px-6 py-3 bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-slate-950 rounded-xl font-bold transition disabled:opacity-50">
                      {{ saving ? 'Enregistrement...' : 'Enregistrer mes offres' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- Messages Globaux -->
              <div v-if="saveError || successMessage" class="mt-6">
                <div v-if="saveError" class="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                  {{ saveError }}
                </div>
                <div v-if="successMessage" class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
                  {{ successMessage }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CoachGameRole,
  GameRankOption,
  ProfileFieldErrors,
  ProfileFormData,
} from "../../types/profile";
import { validateUrl } from "../../utils/validation";
import {
  toProfileFormData,
  useCoachProfile,
} from "../../composables/useCoachProfile";

definePageMeta({
  middleware: ["auth", "onboarding"],
});

useHead({
  title: "Paramètres · CoachMe",
});

const user = useSupabaseUser();
const client = useSupabaseClient();
const { getCoachProfile, updateCoachProfile } = useCoachProfile();
const {
  getAvailableGames,
  getGameRanks,
  getCoachGameRoles,
  upsertCoachGameRoles,
} = useCoachGames();

// Tabs configuration
const activeTab = ref('profile');
const tabs = [
  { id: 'profile', label: 'Profil', icon: 'i-heroicons-user-circle' },
  { id: 'security', label: 'Sécurité', icon: 'i-heroicons-shield-check' },
  { id: 'games', label: 'Mes Jeux', icon: 'i-heroicons-puzzle-piece' },
  { id: 'coaching', label: 'Coaching', icon: 'i-heroicons-academic-cap' },
];

const loading = ref(true);
const saving = ref(false);
const saveError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const fieldErrors = ref<ProfileFieldErrors>({});
const availableGames = ref<Array<{ id: string; slug: string; name: string; iconUrl?: string | null }>>([]);
const gameRanksByGameId = ref<Record<string, GameRankOption[]>>({});
const activeUserId = ref<string | null>(null);

// Security form
const securityLoading = ref(false);
const securityMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null);
const securityForm = ref({
  newEmail: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const profileForm = ref<ProfileFormData>({
  fullName: "",
  avatarUrl: "",
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

const isCoach = computed(() =>
  gameRoles.value.some((role) => role.selected && role.isCoach),
);

const clearMessages = () => {
  saveError.value = null;
  successMessage.value = null;
};

const hydrateRoles = (
  games: Array<{ id: string; name: string }>,
  existingRoles: CoachGameRole[],
): CoachGameRole[] => {
  const existingByGameId = new Map(
    existingRoles.map((role) => [role.gameId, role]),
  );

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
  const fullName = profileForm.value.fullName.trim();
  const avatarUrl = profileForm.value.avatarUrl.trim();
  const bio = profileForm.value.bio.trim();
  const selectedRoles = gameRoles.value.filter((role) => role.selected);
  const coachRoles = selectedRoles.filter((role) => role.isCoach);

  if (!fullName) {
    errors.fullName = "Le nom complet ou pseudo est requis.";
  } else if (fullName.length > 50) {
    errors.fullName = "Le nom doit faire au maximum 50 caractères.";
  }

  if (avatarUrl && !validateUrl(avatarUrl)) {
    errors.avatarUrl = "L'URL de l'avatar est invalide.";
  }

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

  if (isCoach.value) {
    for (const role of coachRoles) {
      if (!role.offers.length) {
        errors.offers = "Chaque jeu coaché doit avoir au moins une offre.";
        break;
      }

      for (const offer of role.offers) {
        if (
          offer.hourlyRate === null ||
          Number.isNaN(Number(offer.hourlyRate)) ||
          Number(offer.hourlyRate) <= 0
        ) {
          errors.offers =
            "Chaque offre doit avoir un tarif horaire strictement positif.";
          break;
        }

        if (offer.description.trim().length > 1200) {
          errors.offers =
            "La description d’une offre ne doit pas dépasser 1200 caractères.";
          break;
        }

        for (const url of offer.videoUrls) {
          if (!validateUrl(url)) {
            errors.offers =
              "Toutes les URLs vidéo des offres doivent être valides.";
            break;
          }
        }
        if (errors.offers) break;
      }
      if (errors.offers) break;
    }
  }

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const load = async (userId: string) => {
  loading.value = true;
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
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resolveUserId = async (): Promise<string | null> => {
  const stateUserId = user.value?.id || user.value?.sub;
  if (stateUserId) return stateUserId;
  const authUser = (await client.auth.getUser()).data.user;
  return authUser?.id || (authUser as any)?.sub || null;
};

onMounted(async () => {
  const resolvedId = await resolveUserId();
  activeUserId.value = resolvedId;
  if (resolvedId) await load(resolvedId);
});

const onValidate = () => {
  clearMessages();
  validateForm();
};

const onSave = async () => {
  if (saving.value) return;

  const id = activeUserId.value ?? (await resolveUserId());
  if (!id) return;

  clearMessages();
  if (!validateForm()) {
    saveError.value = "Veuillez corriger les erreurs avant d'enregistrer.";
    return;
  }

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

    successMessage.value = "Modifications enregistrées.";
    setTimeout(() => successMessage.value = null, 3000);
    await load(id);
  } catch (error: any) {
    saveError.value = error?.message || "Erreur lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
};

const updateEmail = async () => {
  if (!securityForm.value.newEmail) return;
  securityLoading.value = true;
  securityMessage.value = null;
  try {
    const { error } = await client.auth.updateUser({ email: securityForm.value.newEmail });
    if (error) throw error;
    securityMessage.value = { text: "Un email de confirmation a été envoyé à la nouvelle adresse.", type: 'success' };
    securityForm.value.newEmail = '';
  } catch (error: any) {
    securityMessage.value = { text: error.message, type: 'error' };
  } finally {
    securityLoading.value = false;
  }
};

const updatePassword = async () => {
  if (!securityForm.value.currentPassword || !securityForm.value.newPassword) {
    securityMessage.value = { text: "Veuillez remplir tous les champs.", type: 'error' };
    return;
  }
  if (securityForm.value.newPassword !== securityForm.value.confirmPassword) {
    securityMessage.value = { text: "Les nouveaux mots de passe ne correspondent pas.", type: 'error' };
    return;
  }
  securityLoading.value = true;
  securityMessage.value = null;
  try {
    // 1. Vérifier l'ancien mot de passe en essayant de se re-connecter
    const { error: reauthError } = await client.auth.signInWithPassword({
      email: user.value?.email || '',
      password: securityForm.value.currentPassword,
    });

    if (reauthError) {
      throw new Error("L'ancien mot de passe est incorrect.");
    }

    // 2. Mettre à jour avec le nouveau mot de passe
    const { error } = await client.auth.updateUser({ password: securityForm.value.newPassword });
    if (error) throw error;

    securityMessage.value = { text: "Mot de passe mis à jour avec succès.", type: 'success' };
    securityForm.value.currentPassword = '';
    securityForm.value.newPassword = '';
    securityForm.value.confirmPassword = '';
  } catch (error: any) {
    securityMessage.value = { text: error.message, type: 'error' };
  } finally {
    securityLoading.value = false;
  }
};
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
