<template>
  <div class="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header class="space-y-2">
        <NuxtLink
          to="/sessions"
          class="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-400 transition hover:text-indigo-400"
        >
          <span aria-hidden="true">←</span>
          Changer de jeu
        </NuxtLink>
        <p
          class="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-indigo-400"
        >
          CoachMe · Trouver un coach
        </p>
        <h1 class="text-2xl font-semibold sm:text-3xl">
          Coachs pour {{ gameName ?? gameSlug }}
        </h1>
        <p class="max-w-2xl text-sm text-slate-300/85">
          Filtre par nom ou bio et explore les profils pour trouver le coach qui
          te correspond.
        </p>
      </header>

      <CoachFilters
        :games="gameOptions"
        :selected-game-slug="filters.gameSlug"
        :search-text="filters.searchText"
        :show-game-select="false"
        @update:searchText="setSearchText"
      />

      <section class="min-h-[160px]">
        <div
          v-if="error"
          class="mb-4 rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
        >
          {{ error }}
        </div>

        <div v-if="loading" class="text-xs text-slate-300/80">
          Chargement des coachs…
        </div>

        <div
          v-else-if="!results.length"
          class="rounded-2xl border border-white/10 bg-[#020617]/80 p-6 text-xs text-slate-300/85"
        >
          Aucun coach trouvé pour ce jeu avec les filtres actuels.
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2">
          <CoachCard
            v-for="coach in results"
            :key="coach.profileId"
            :coach="coach"
            :selected-game-slug="filters.gameSlug"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCoaches } from "~/composables/useCoaches";

type GameOption = {
  id: string;
  slug: string;
  name: string;
};

const route = useRoute();
const gameSlug = computed(() => (route.params.gameSlug as string) ?? "");

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Trouver un coach · CoachMe",
});

const client = useSupabaseClient();

const gameOptions = ref<GameOption[]>([]);
const gameName = ref<string | null>(null);

const { loading, error, results, filters, loadCoaches, setGameFilter } =
  useCoaches();

const loadGames = async () => {
  const { data, error: gamesError } = await (client as any)
    .from("games")
    .select("id, slug, name")
    .order("name", { ascending: true });

  if (gamesError) {
    console.error(gamesError);
    return;
  }

  gameOptions.value = (data ?? []) as GameOption[];

  const current = gameOptions.value.find((g) => g.slug === gameSlug.value);
  gameName.value = current?.name ?? null;

  setGameFilter(gameSlug.value || null);
};

watch(
  () => route.params.gameSlug,
  async (slug) => {
    if (slug) {
      setGameFilter(slug as string);
      await loadCoaches();
    }
  },
  { immediate: false },
);

onMounted(async () => {
  await loadGames();
  if (gameSlug.value) {
    setGameFilter(gameSlug.value);
  }
});
</script>
