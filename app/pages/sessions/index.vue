<template>
  <div class="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
    <div class="mx-auto w-full max-w-5xl">
      <header class="mb-6 space-y-2">
        <p
          class="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-indigo-400"
        >
          CoachMe · Trouver un coach
        </p>
        <h1 class="text-2xl font-semibold sm:text-3xl">Choisis ton jeu</h1>
        <p class="max-w-2xl text-sm text-slate-300/85">
          Sélectionne un jeu pour voir les coachs disponibles et trouver celui
          qui te correspond.
        </p>
      </header>

      <div class="mb-6">
        <div class="relative max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Filtrer les jeux par nom…"
            class="w-full rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400/70 outline-none transition focus:border-[#14b8a6]/60"
          />
        </div>
      </div>

      <div v-if="loading" class="text-sm text-slate-400">
        Chargement des jeux…
      </div>

      <div
        v-else-if="filteredGames.length === 0"
        class="rounded-2xl border border-white/10 bg-[#020617]/80 p-8 text-center text-sm text-slate-400"
      >
        Aucun jeu disponible pour le moment.
      </div>

      <section
        v-else
        class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <GameCard
          v-for="game in filteredGames"
          :key="game.id"
          :game="game"
          :coach-count="coachCountByGameId.get(game.id) ?? null"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
type Game = {
  id: string;
  slug: string;
  name: string;
};

definePageMeta({
  middleware: ["auth"],
});

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
