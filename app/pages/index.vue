<script setup lang="ts">
type Game = {
  id: string;
  slug: string;
  name: string;
};

useHead({
  title: "Choisir un jeu · CoachMe",
});

const client = useSupabaseClient();

const loading = ref(true);
const games = ref<Game[]>([]);
const search = ref("");

const filteredGames = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return games.value;
  return games.value.filter((game) => {
    const name = game.name.toLowerCase();
    const slug = game.slug.toLowerCase();
    return name.includes(term) || slug.includes(term);
  });
});

const coachCountByGameId = ref<Map<string, number>>(new Map());

const loadGames = async () => {
  const { data, error } = await (client as any)
    .from("games")
    .select("id, slug, name")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    loading.value = false;
    return;
  }

  games.value = (data ?? []) as Game[];

  if (games.value.length > 0) {
    const { data: counts } = await (client as any)
      .from("profile_game_roles")
      .select("game_id")
      .eq("is_coach", true);

    const map = new Map<string, number>();
    for (const row of counts ?? []) {
      const id = row.game_id as string;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    coachCountByGameId.value = map;
  }

  loading.value = false;
};

onMounted(loadGames);
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header class="mb-10 space-y-3">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
        CoachMe · Trouver un coach
      </p>
      <h1 class="text-3xl font-black text-white md:text-4xl">Choisis ton jeu</h1>
      <p class="max-w-xl text-sm text-slate-400">
        Sélectionne un jeu pour voir les coachs disponibles et trouver celui qui te correspond.
      </p>
    </header>

    <!-- Search -->
    <div class="mb-8">
      <div class="relative max-w-xs">
        <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          v-model="search"
          type="text"
          placeholder="Filtrer les jeux…"
          class="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-teal-500/40 focus:bg-white/[0.07]"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 text-sm text-slate-500">
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-500" />
      Chargement des jeux…
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredGames.length === 0"
      class="rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center"
    >
      <p class="text-sm text-slate-500">Aucun jeu disponible pour le moment.</p>
    </div>

    <!-- Grid -->
    <section v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <GameCard
        v-for="game in filteredGames"
        :key="game.id"
        :game="game"
        :coach-count="coachCountByGameId.get(game.id) ?? null"
      />
    </section>
  </div>
</template>
