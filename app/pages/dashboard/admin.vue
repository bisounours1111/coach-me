<template>
  <div class="mx-auto min-h-screen w-full max-w-5xl space-y-8 px-4 py-10">
    <div>
      <h1 class="text-2xl font-semibold text-slate-50">Dashboard admin</h1>
      <p class="mt-2 text-sm text-slate-300/85">
        Gère les jeux disponibles et les rangs proposés pour chaque jeu.
      </p>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90"
    >
      {{ successMessage }}
    </div>

    <section
      class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-5 backdrop-blur"
    >
      <h2 class="text-sm font-semibold text-slate-100">Ajouter un jeu</h2>
      <form
        class="mt-4 flex flex-col gap-3 sm:flex-row"
        @submit.prevent="onAddGame"
      >
        <input
          v-model="newGameName"
          type="text"
          placeholder="Ex : League of Legends"
          class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 outline-none transition focus:border-[#14b8a6]/50"
          required
        />
        <button
          type="submit"
          :disabled="loadingGame"
          class="inline-flex items-center justify-center rounded-xl bg-[#14b8a6] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#14b8a6]/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {{ loadingGame ? "Ajout..." : "Ajouter" }}
        </button>
      </form>
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-slate-100">Jeux et rangs</h2>
      <div
        v-for="game in games"
        :key="game.id"
        class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-5 backdrop-blur"
      >
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-semibold text-slate-50">{{ game.name }}</p>
            <p class="text-[0.7rem] uppercase tracking-wide text-slate-300/70">
              {{ game.slug }}
            </p>
          </div>
          <button
            type="button"
            :disabled="loadingByGame[game.id]"
            class="inline-flex items-center justify-center rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/10 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-[#f43f5e]/20 disabled:cursor-not-allowed disabled:opacity-70"
            @click="onDeleteGame(game.id)"
          >
            Supprimer le jeu
          </button>
        </div>

        <form
          class="mt-4 flex flex-col gap-3 sm:flex-row"
          @submit.prevent="onAddRank(game.id)"
        >
          <input
            v-model="rankDraftByGame[game.id]"
            type="text"
            placeholder="Ex : Bronze, Silver, Gold..."
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 outline-none transition focus:border-[#14b8a6]/50"
            required
          />
          <button
            type="submit"
            :disabled="loadingByGame[game.id]"
            class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Ajouter un rang
          </button>
        </form>

        <div class="mt-4 flex flex-wrap gap-2">
          <div
            v-for="rank in ranksByGameId[game.id] ?? []"
            :key="rank.id"
            class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100"
          >
            <img
              v-if="rank.icon_url"
              :src="rank.icon_url"
              :alt="`Icône ${rank.label}`"
              class="h-4 w-4 rounded-sm object-cover"
            />
            <span>{{ rank.label }}</span>
            <label
              class="cursor-pointer text-slate-300 transition hover:text-emerald-300"
            >
              <input
                type="file"
                class="hidden"
                accept="image/*"
                :disabled="loadingIconByRank[rank.id]"
                @change="onUploadRankIcon($event, rank, game)"
              />
              {{ loadingIconByRank[rank.id] ? "Upload..." : "Icône" }}
            </label>
            <button
              type="button"
              :disabled="loadingByGame[game.id] || loadingIconByRank[rank.id]"
              class="text-slate-300 transition hover:text-rose-300 disabled:opacity-70"
              @click="onDeleteRank(rank.id, game.id)"
            >
              x
            </button>
          </div>

          <p
            v-if="!ranksByGameId[game.id]?.length"
            class="text-xs text-slate-300/70"
          >
            Aucun rang configuré pour ce jeu.
          </p>
        </div>
      </div>

      <p v-if="!games.length" class="text-xs text-slate-300/80">
        Aucun jeu pour le moment.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
type AdminGame = {
  id: string;
  name: string;
  slug: string;
};

type GameRank = {
  id: string;
  game_id: string;
  label: string;
  sort_order: number;
  icon_url: string | null;
};

const client = useSupabaseClient();

const games = ref<AdminGame[]>([]);
const ranks = ref<GameRank[]>([]);
const newGameName = ref("");
const rankDraftByGame = ref<Record<string, string>>({});
const loadingGame = ref(false);
const loadingByGame = ref<Record<string, boolean>>({});
const loadingIconByRank = ref<Record<string, boolean>>({});
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const ranksByGameId = computed<Record<string, GameRank[]>>(() => {
  const map: Record<string, GameRank[]> = {};

  for (const rank of ranks.value) {
    const gameRanks = map[rank.game_id] ?? [];
    gameRanks.push(rank);
    map[rank.game_id] = gameRanks;
  }

  for (const gameRanks of Object.values(map)) {
    gameRanks.sort(
      (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
    );
  }

  return map;
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFileExtension = (file: File): string => {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
  return "png";
};

const loadData = async () => {
  errorMessage.value = null;

  const [{ data: gamesData, error: gamesError }, ranksResult] =
    await Promise.all([
      (client as any)
        .from("games")
        .select("id,name,slug")
        .order("name", { ascending: true }),
      (client as any)
        .from("game_ranks")
        .select("id,game_id,label,sort_order,icon_url")
        .order("sort_order", { ascending: true }),
    ]);

  if (gamesError) {
    errorMessage.value = "Impossible de charger les jeux.";
    return;
  }

  let ranksData = ranksResult.data ?? [];
  let ranksError = ranksResult.error ?? null;

  // Retro-compat: si la migration icon_url n'est pas encore appliquée.
  if (ranksError && String(ranksError.message ?? "").includes("icon_url")) {
    const fallback = await (client as any)
      .from("game_ranks")
      .select("id,game_id,label,sort_order")
      .order("sort_order", { ascending: true });

    ranksData = ((fallback.data ?? []) as Array<Record<string, any>>).map(
      (rank) => ({
        ...rank,
        icon_url: null,
      }),
    );
    ranksError = fallback.error ?? null;
  }

  if (ranksError) {
    errorMessage.value =
      "Les jeux sont chargés, mais impossible de charger les rangs.";
  }

  games.value = (gamesData ?? []) as AdminGame[];
  ranks.value = (ranksData ?? []) as GameRank[];
};

const withGameLoading = async (
  gameId: string,
  callback: () => Promise<void>,
) => {
  loadingByGame.value = { ...loadingByGame.value, [gameId]: true };
  try {
    await callback();
  } finally {
    loadingByGame.value = { ...loadingByGame.value, [gameId]: false };
  }
};

const onAddGame = async () => {
  if (loadingGame.value) return;

  successMessage.value = null;
  errorMessage.value = null;
  loadingGame.value = true;

  const trimmedName = newGameName.value.trim();
  const slug = slugify(trimmedName);

  if (!trimmedName || !slug) {
    loadingGame.value = false;
    errorMessage.value = "Le nom du jeu est invalide.";
    return;
  }

  const { error } = await (client as any)
    .from("games")
    .insert({ name: trimmedName, slug });

  loadingGame.value = false;

  if (error) {
    errorMessage.value =
      "Impossible d'ajouter ce jeu. Vérifie qu'il n'existe pas déjà.";
    return;
  }

  newGameName.value = "";
  successMessage.value = "Jeu ajouté.";
  await loadData();
};

const onDeleteGame = async (gameId: string) => {
  successMessage.value = null;
  errorMessage.value = null;

  await withGameLoading(gameId, async () => {
    const { error } = await (client as any)
      .from("games")
      .delete()
      .eq("id", gameId);
    if (error) {
      errorMessage.value = "Impossible de supprimer ce jeu.";
      return;
    }
    successMessage.value = "Jeu supprimé.";
    await loadData();
  });
};

const onAddRank = async (gameId: string) => {
  successMessage.value = null;
  errorMessage.value = null;

  const label = (rankDraftByGame.value[gameId] ?? "").trim();
  if (!label) {
    return;
  }

  await withGameLoading(gameId, async () => {
    const gameRanks = ranksByGameId.value[gameId] ?? [];
    const nextSortOrder = gameRanks.length
      ? Math.max(...gameRanks.map((rank) => rank.sort_order)) + 1
      : 1;

    const { error } = await (client as any)
      .from("game_ranks")
      .insert({ game_id: gameId, label, sort_order: nextSortOrder });

    if (error) {
      errorMessage.value = "Impossible d'ajouter ce rang.";
      return;
    }

    rankDraftByGame.value = { ...rankDraftByGame.value, [gameId]: "" };
    successMessage.value = "Rang ajouté.";
    await loadData();
  });
};

const onDeleteRank = async (rankId: string, gameId: string) => {
  successMessage.value = null;
  errorMessage.value = null;

  await withGameLoading(gameId, async () => {
    const { error } = await (client as any)
      .from("game_ranks")
      .delete()
      .eq("id", rankId);
    if (error) {
      errorMessage.value = "Impossible de supprimer ce rang.";
      return;
    }
    successMessage.value = "Rang supprimé.";
    await loadData();
  });
};

const withRankIconLoading = async (
  rankId: string,
  callback: () => Promise<void>,
) => {
  loadingIconByRank.value = { ...loadingIconByRank.value, [rankId]: true };
  try {
    await callback();
  } finally {
    loadingIconByRank.value = { ...loadingIconByRank.value, [rankId]: false };
  }
};

const onUploadRankIcon = async (
  event: Event,
  rank: GameRank,
  game: AdminGame,
) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  target.value = "";

  if (!file) return;
  if (!file.type.startsWith("image/")) {
    errorMessage.value = "Le fichier doit être une image.";
    return;
  }

  successMessage.value = null;
  errorMessage.value = null;

  await withRankIconLoading(rank.id, async () => {
    const extension = getFileExtension(file);
    const rankSlug = slugify(rank.label) || rank.id;
    const objectPath = `${game.slug}/${rankSlug}.${extension}`;

    const { error: uploadError } = await (client as any).storage
      .from("rank")
      .upload(objectPath, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      errorMessage.value = "Impossible d'uploader l'icône.";
      return;
    }

    const { data: publicData } = (client as any).storage
      .from("rank")
      .getPublicUrl(objectPath);
    const iconUrl = publicData?.publicUrl ?? null;

    const { error: updateError } = await (client as any)
      .from("game_ranks")
      .update({ icon_url: iconUrl })
      .eq("id", rank.id);

    if (updateError) {
      errorMessage.value =
        "Icône uploadée, mais impossible de l'enregistrer en base.";
      return;
    }

    successMessage.value = "Icône de rang mise à jour.";
    await loadData();
  });
};

definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "maintainer",
});

await loadData();

useHead({
  title: "Dashboard admin · Coach Me",
});
</script>
