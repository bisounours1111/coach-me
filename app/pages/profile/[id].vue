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
  if (user.value) {
    authUserId.value = user.value.id;
  } else {
    const { data } = await client.auth.getUser();
    authUserId.value = data.user?.id ?? null;
  }
});

const isOwnProfile = computed(() => {
  const currentId = user.value?.id || authUserId.value;
  const targetId = profile.value?.id;
  
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

const isCoach = computed(() => coachGames.value.length > 0);

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
  <div class="min-h-screen">
    <!-- Loading -->
    <div v-if="pending" class="flex min-h-screen items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500"
        />
        <p class="text-sm text-slate-500">Chargement du profil…</p>
      </div>
    </div>

    <!-- Not found -->
    <div
      v-else-if="error || !profile"
      class="flex min-h-screen items-center justify-center px-4"
    >
      <div class="space-y-4 text-center">
        <div class="text-6xl">👻</div>
        <h1 class="text-2xl font-bold text-slate-200">Profil introuvable</h1>
        <p class="text-slate-500">Ce profil n'existe pas ou a été supprimé.</p>
        <NuxtLink
          to="/"
          class="inline-block rounded-xl border border-teal-500/25 bg-teal-500/10 px-6 py-2 text-teal-400 transition-colors hover:bg-teal-500/20"
        >
          Retour à l'accueil
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- Hero -->
      <ProfileHeader
        :profile="profile"
        :is-coach="isCoach"
        :min-rate="minRate"
        :is-own-profile="isOwnProfile"
      />

      <main class="mx-auto max-w-6xl space-y-20 px-4 pb-28">
        <!-- Games -->
        <section v-if="profile.games.length" class="space-y-5">
          <div class="flex items-center gap-4">
            <div
              class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
            <h2
              class="text-xs font-bold uppercase tracking-widest text-slate-500"
            >
              Univers de jeu
            </h2>
            <div
              class="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
          <div
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            <ProfileGameCard
              v-for="game in profile.games"
              :key="game.profileGameRoleId"
              :game="game"
            />
          </div>
        </section>

        <!-- Per-game coaching sections -->
        <template v-for="game in coachGames" :key="game.profileGameRoleId">
          <section
            v-if="profile.offersByRoleId[game.profileGameRoleId]?.length"
            class="space-y-8"
          >
            <!-- Game section header -->
            <div class="flex items-center gap-4">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-indigo-600 text-lg font-bold text-white"
              >
                {{ game.gameName.charAt(0) }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-100">
                  {{ game.gameName }}
                </h2>
                <p class="text-sm text-slate-500">
                  {{
                    (profile.offersByRoleId[game.profileGameRoleId] ?? [])
                      .length
                  }}
                  offre{{
                    (profile.offersByRoleId[game.profileGameRoleId] ?? [])
                      .length > 1
                      ? "s"
                      : ""
                  }}
                  de coaching
                </p>
              </div>
              <div
                class="ml-auto hidden h-px flex-1 bg-gradient-to-r from-white/10 to-transparent sm:block"
              />
            </div>

            <!-- Videos -->
            <div
              v-if="
                getAllVideoUrls(
                  profile.offersByRoleId[game.profileGameRoleId] ?? [],
                ).length
              "
              class="space-y-4"
            >
              <h3
                class="flex items-center gap-2 text-sm font-semibold text-slate-400"
              >
                <UIcon
                  name="i-heroicons-video-camera"
                  class="h-4 w-4 text-teal-500"
                />
                Vidéos de coaching
              </h3>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <ProfileVideoCard
                  v-for="url in getAllVideoUrls(
                    profile.offersByRoleId[game.profileGameRoleId] ?? [],
                  )"
                  :key="url"
                  :video-url="url"
                />
              </div>
            </div>

            <!-- Pricing cards -->
            <div class="space-y-4">
              <h3
                class="flex items-center gap-2 text-sm font-semibold text-slate-400"
              >
                <UIcon
                  name="i-heroicons-banknotes"
                  class="h-4 w-4 text-teal-500"
                />
                Offres de coaching
              </h3>
              <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ProfilePricingCard
                  v-for="offer in profile.offersByRoleId[
                    game.profileGameRoleId
                  ] ?? []"
                  :key="offer.id"
                  :offer="offer"
                  :game-name="game.gameName"
                />
              </div>
            </div>
          </section>
        </template>

        <!-- Empty state — player profile -->
        <section v-if="!isCoach" class="py-16 text-center">
          <div
            class="mx-auto max-w-sm space-y-4 rounded-2xl border border-white/8 bg-white/3 px-8 py-12 backdrop-blur-sm"
          >
            <UIcon
              name="i-heroicons-user-circle"
              class="mx-auto h-14 w-14 text-slate-700"
            />
            <p class="font-semibold text-slate-300">Pas encore de coaching</p>
            <p class="text-sm text-slate-500">
              Ce joueur ne propose pas de session de coaching pour l'instant.
            </p>
          </div>
        </section>
      </main>
    </template>
  </div>
</template>
