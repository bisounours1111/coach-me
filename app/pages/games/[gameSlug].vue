<script setup lang="ts">
import { useCoaches } from "~/composables/useCoaches";

type GameOption = {
  id: string;
  slug: string;
  name: string;
};

const route = useRoute();
const gameSlug = computed(() => (route.params.gameSlug as string) ?? "");

useHead({
  title: "Trouver un coach · CoachMe",
});

const client = useSupabaseClient();

const gameOptions = ref<GameOption[]>([]);
const gameName = ref<string | null>(null);

const { loading, error, results, filters, loadCoaches, setGameFilter } =
  useCoaches();

const setSearchText = (value: string) => {
  filters.value.searchText = value;
};

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

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header class="mb-10 space-y-3">
      <NuxtLink
        to="/games"
        class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-teal-400"
      >
        <UIcon name="i-heroicons-arrow-left" class="h-3.5 w-3.5" />
        Changer de jeu
      </NuxtLink>
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80"
      >
        CoachMe · Trouver un coach
      </p>
      <h1 class="text-3xl font-black text-white md:text-4xl">
        Coachs {{ gameName ?? gameSlug }}
      </h1>
      <p class="max-w-xl text-sm text-slate-400">
        Filtre par nom ou bio et explore les profils pour trouver le coach qui
        te correspond.
      </p>
    </header>

    <!-- Filters -->
    <CoachFilters
      :games="gameOptions"
      :selected-game-slug="filters.gameSlug"
      :search-text="filters.searchText"
      :show-game-select="false"
      @update:searchText="setSearchText"
    />

    <!-- Results -->
    <section class="mt-8 min-h-[160px]">
      <div
        v-if="error"
        class="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
      >
        {{ error }}
      </div>

      <div
        v-if="loading"
        class="flex items-center gap-3 text-sm text-slate-500"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-500"
        />
        Chargement des coachs…
      </div>

      <div
        v-else-if="!results.length"
        class="rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center"
      >
        <UIcon
          name="i-heroicons-user-group"
          class="mx-auto mb-3 h-8 w-8 text-slate-600"
        />
        <p class="text-sm text-slate-500">
          Aucun coach trouvé pour ce jeu avec les filtres actuels.
        </p>
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
</template>
