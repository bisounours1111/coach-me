<script setup lang="ts">
const route = useRoute();
const user = useSupabaseUser();
const client = useSupabaseClient();
const { getPublicProfile } = usePublicProfile();

type ProfileData = Awaited<ReturnType<typeof getPublicProfile>>;
type CoachingOfferList = NonNullable<ProfileData>["offersByRoleId"][string];

const authUserId = ref<string | null>(null);

// Récupération robuste de l'ID utilisateur connecté
onMounted(async () => {
  const userId = user.value?.id || user.value?.sub;
  if (userId) {
    authUserId.value = userId;
  } else {
    const { data } = await client.auth.getUser();
    authUserId.value = data.user?.id || (data.user as any)?.sub || null;
  }
});

const isOwnProfile = computed(() => {
  const currentId = user.value?.id || user.value?.sub || authUserId.value;
  const targetId = profile.value?.id || profile.value?.sub;
  if (!currentId || !targetId) return false;
  return String(currentId).toLowerCase() === String(targetId).toLowerCase();
});

const {
  data: profile,
  pending,
  error,
} = await useAsyncData<ProfileData>(`profile-${route.params.id}`, () =>
  getPublicProfile(route.params.id as string),
);

const coachGames = computed(
  () => profile.value?.games.filter((g) => g.isCoach) ?? [],
);

const minRate = computed(() => {
  if (!profile.value) return null;
  const rates = Object.values(profile.value.offersByRoleId)
    .flat()
    .map((o) => o.hourlyRate)
    .filter((r): r is number => r !== null);
  return rates.length ? Math.min(...rates) : null;
});

const getAllVideoUrls = (offers: CoachingOfferList) => [
  ...new Set(offers.flatMap((o) => o.videoUrls)),
];
</script>

<template>
  <div
    class="min-h-screen bg-[#050812] text-slate-200 selection:bg-teal-500/30"
  >
    <!-- Loading State -->
    <div
      v-if="pending"
      class="flex min-h-screen flex-col items-center justify-center gap-6"
    >
      <div class="relative flex h-20 w-20 items-center justify-center">
        <div
          class="absolute inset-0 animate-ping rounded-full bg-teal-500/20"
        />
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500"
        />
      </div>
      <p
        class="animate-pulse text-sm font-bold uppercase tracking-widest text-slate-500"
      >
        Synchronisation du profil...
      </p>
    </div>

    <!-- Error / Not Found -->
    <div
      v-else-if="error || !profile"
      class="flex min-h-screen items-center justify-center px-4"
    >
      <div class="max-w-md space-y-8 text-center">
        <div class="relative mx-auto h-32 w-32">
          <div
            class="absolute inset-0 animate-pulse rounded-full bg-rose-500/10 blur-2xl"
          />
          <div
            class="relative flex h-full w-full items-center justify-center text-7xl"
          >
            👻
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-3xl font-black text-white">Profil introuvable</h1>
          <p class="text-slate-500">
            Le joueur que vous recherchez n'existe pas ou a désactivé son
            compte.
          </p>
        </div>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-8 py-4 text-sm font-bold text-white ring-1 ring-white/10 transition-all hover:bg-white/10"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          RETOUR À L'ACCUEIL
        </NuxtLink>
      </div>
    </div>

    <!-- Main Profile Content -->
    <template v-else>
      <ProfileHeader
        :profile="profile"
        :min-rate="minRate"
        :is-own-profile="isOwnProfile"
      />

      <main class="mx-auto max-w-6xl px-4 pb-32 mt-12 md:mt-16">
        <div class="grid gap-12 lg:grid-cols-[1fr_320px]">
          <!-- Left Column: Coaching & Content -->
          <div class="space-y-16">
            <!-- Coaching Sections -->
            <div v-if="coachGames.length > 0" class="space-y-20">
              <div
                v-for="game in coachGames"
                :key="game.profileGameRoleId"
                class="space-y-10"
              >
                <!-- Section Header -->
                <div class="flex items-center gap-6">
                  <div
                    v-if="game.gameIconUrl"
                    class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-teal-950/20"
                  >
                    <img
                      :src="game.gameIconUrl"
                      :alt="game.gameName"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div
                    v-else
                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 text-xl font-black text-white shadow-xl shadow-teal-950/20"
                  >
                    {{ game.gameName.charAt(0) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <h2
                      class="truncate text-2xl font-black text-white md:text-3xl"
                    >
                      Coaching {{ game.gameName }}
                    </h2>
                    <p
                      class="text-sm font-bold uppercase tracking-widest text-teal-500/80"
                    >
                      {{
                        profile.offersByRoleId[game.profileGameRoleId]
                          ?.length || 0
                      }}
                      offre(s) disponible(s)
                    </p>
                  </div>
                </div>

                <!-- Offers Grid -->
                <div class="grid gap-6 md:grid-cols-2">
                  <ProfilePricingCard
                    v-for="offer in profile.offersByRoleId[
                      game.profileGameRoleId
                    ] ?? []"
                    :key="offer.id"
                    :offer="offer"
                    :game-name="game.gameName"
                    :is-own-profile="isOwnProfile"
                    :has-future-availabilities="profile.hasFutureAvailabilities"
                    :coach-id="profile.id"
                  />
                </div>

                <!-- Showcase Videos -->
                <div
                  v-if="
                    getAllVideoUrls(
                      profile.offersByRoleId[game.profileGameRoleId] ?? [],
                    ).length
                  "
                  class="space-y-6"
                >
                  <div class="flex items-center gap-3 text-slate-400">
                    <UIcon
                      name="i-heroicons-play-circle"
                      class="h-5 w-5 text-teal-500"
                    />
                    <h3 class="text-xs font-black uppercase tracking-[0.2em]">
                      Showcase & Replays
                    </h3>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ProfileVideoCard
                      v-for="url in getAllVideoUrls(
                        profile.offersByRoleId[game.profileGameRoleId] ?? [],
                      )"
                      :key="url"
                      :video-url="url"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Info Section if no coaching -->
            <div v-else class="py-12">
              <div
                class="rounded-3xl border border-white/5 bg-white/[0.02] p-10 backdrop-blur-sm"
              >
                <div class="flex items-start gap-6">
                  <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-400"
                  >
                    <UIcon name="i-heroicons-user" class="h-6 w-6" />
                  </div>
                  <div class="space-y-2">
                    <h3 class="text-xl font-bold text-white">Profil Joueur</h3>
                    <p class="text-slate-400 leading-relaxed">
                      Ce joueur n'a pas encore configuré d'offres de coaching.
                      Vous pouvez tout de même consulter ses jeux et ses
                      statistiques dans la barre latérale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Sidebar (Games & Stats) -->
          <div class="space-y-10">
            <!-- Games List -->
            <section class="space-y-6">
              <div class="flex items-center justify-between">
                <h3
                  class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Univers de jeu
                </h3>
                <span
                  class="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400"
                >
                  {{ profile.games.length }}
                </span>
              </div>
              <div class="grid gap-3">
                <ProfileGameCard
                  v-for="game in profile.games"
                  :key="game.profileGameRoleId"
                  :game="game"
                />
              </div>
            </section>

            <!-- Quick Info / Trust Badge -->
            <div
              class="rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-500/5 to-teal-500/5 p-6"
            >
              <div class="flex items-center gap-3 text-indigo-400">
                <UIcon name="i-heroicons-shield-check" class="h-5 w-5" />
                <span class="text-xs font-bold uppercase tracking-wider"
                  >Paiement Sécurisé</span
                >
              </div>
              <p class="mt-3 text-[11px] leading-relaxed text-slate-500">
                Toutes les transactions sur CoachMe sont protégées. Le coach
                n'est payé qu'une fois la session terminée.
              </p>
            </div>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<style>
/* Smooth entrance for sections */
.fade-up-enter-active {
  transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>
