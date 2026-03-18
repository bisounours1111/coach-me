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
        class="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19]/45 backdrop-blur transition-all"
        :class="expandedGames[game.id] ? 'ring-1 ring-teal-500/30' : ''"
      >
        <!-- Header de l'accordéon -->
        <div
          class="flex cursor-pointer items-center justify-between p-5 transition hover:bg-white/5"
          @click="toggleGameExpansion(game.id)"
        >
          <div class="flex items-center gap-4">
            <div
              class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg"
            >
              <img
                v-if="game.icon_url"
                :src="game.icon_url"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-slate-500"
              >
                <UIcon name="i-heroicons-puzzle-piece" class="h-6 w-6" />
              </div>
              <div
                v-if="loadingIconByGame[game.id]"
                class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="h-5 w-5 animate-spin text-teal-400"
                />
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-base font-bold text-slate-50">{{ game.name }}</p>
                <span
                  class="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400"
                >
                  {{ ranksByGameId[game.id]?.length || 0 }} rangs
                </span>
              </div>
              <p class="text-[0.7rem] uppercase tracking-widest text-slate-500">
                {{ game.slug }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <label
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-teal-400 transition hover:bg-white/10 active:scale-95"
              title="Modifier l'icône"
              @click.stop
            >
              <UIcon name="i-heroicons-photo" class="h-4 w-4" />
              <input
                type="file"
                class="hidden"
                accept="image/*"
                :disabled="loadingIconByGame[game.id]"
                @change="onUploadGameIcon($event, game)"
              />
            </label>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 transition hover:bg-rose-500/10 active:scale-95"
              title="Supprimer le jeu"
              @click.stop="onDeleteGame(game.id)"
            >
              <UIcon name="i-heroicons-trash" class="h-4 w-4" />
            </button>

            <div
              class="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-transform duration-300"
              :class="expandedGames[game.id] ? 'rotate-180' : ''"
            >
              <UIcon name="i-heroicons-chevron-down" class="h-5 w-5" />
            </div>
          </div>
        </div>

        <!-- Contenu de l'accordéon -->
        <div v-if="expandedGames[game.id]" class="border-t border-white/5 p-5">
          <div class="space-y-6">
            <!-- Formulaire ajout de rang -->
            <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <h3 class="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Ajouter un nouveau rang
              </h3>
              <form
                class="flex flex-col gap-3 sm:flex-row"
                @submit.prevent="onAddRank(game.id)"
              >
                <div class="relative flex-1">
                  <UIcon
                    name="i-heroicons-trophy"
                    class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    v-model="rankDraftByGame[game.id]"
                    type="text"
                    placeholder="Ex : Diamond I, Grandmaster..."
                    class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 pl-10 pr-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none transition focus:border-[#14b8a6]/50"
                    required
                  />
                </div>
                <button
                  type="submit"
                  :disabled="loadingByGame[game.id]"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <UIcon name="i-heroicons-plus" class="h-4 w-4" />
                  Ajouter
                </button>
              </form>
            </div>

            <!-- Liste des rangs avec Drag & Drop -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Rangs configurés (glisser pour réorganiser)
                </h3>
              </div>

              <draggable
                v-model="ranks"
                :component-data="{
                  tag: 'div',
                  type: 'transition-group',
                  name: 'flip-list',
                  class: 'grid gap-2'
                }"
                item-key="id"
                handle=".drag-handle"
                @end="onRankReorder(game.id)"
              >
                <template #item="{ element: rank }">
                  <div
                    v-if="rank.game_id === game.id"
                    class="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.06]"
                  >
                    <div class="flex items-center gap-4">
                      <div class="drag-handle cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400">
                        <UIcon name="i-heroicons-bars-2" class="h-5 w-5" />
                      </div>
                      
                      <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                        <img
                          v-if="rank.icon_url"
                          :src="rank.icon_url"
                          class="h-full w-full object-contain p-1"
                        />
                        <div v-else class="flex h-full w-full items-center justify-center text-slate-700">
                          <UIcon name="i-heroicons-trophy" class="h-5 w-5" />
                        </div>
                        <div
                          v-if="loadingIconByRank[rank.id]"
                          class="absolute inset-0 flex items-center justify-center bg-black/60"
                        >
                          <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin text-teal-400" />
                        </div>
                      </div>

                      <div
                        v-if="editingRankId === rank.id"
                        class="flex flex-1 items-center gap-2"
                      >
                        <input
                          v-model="editingRankLabel"
                          type="text"
                          class="flex-1 rounded-lg border border-teal-500/50 bg-[#0b0f19] px-3 py-1.5 text-sm text-slate-50 outline-none"
                          @keyup.enter="onRenameRank(rank.id, game.id)"
                          @keyup.esc="cancelEditingRank"
                          auto-focus
                        />
                        <button
                          type="button"
                          class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-slate-950 transition hover:bg-teal-400"
                          @click="onRenameRank(rank.id, game.id)"
                        >
                          <UIcon name="i-heroicons-check" class="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-400 transition hover:bg-white/20"
                          @click="cancelEditingRank"
                        >
                          <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                        </button>
                      </div>
                      <span
                        v-else
                        class="cursor-pointer text-sm font-medium text-slate-200 hover:text-teal-400 transition-colors"
                        title="Cliquer pour renommer"
                        @click="startEditingRank(rank)"
                      >
                        {{ rank.label }}
                      </span>
                    </div>

                    <div
                      v-if="editingRankId !== rank.id"
                      class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <label
                        class="flex h-8 items-center gap-2 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-bold text-slate-400 transition hover:bg-white/10 hover:text-teal-400"
                      >
                        <UIcon name="i-heroicons-photo" class="h-3.5 w-3.5" />
                        {{ rank.icon_url ? 'Changer' : 'Ajouter icône' }}
                        <input
                          type="file"
                          class="hidden"
                          accept="image/*"
                          :disabled="loadingIconByRank[rank.id]"
                          @change="onUploadRankIcon($event, rank, game)"
                        />
                      </label>

                      <button
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 transition hover:bg-rose-500/10 active:scale-95"
                        @click="onDeleteRank(rank.id, game.id)"
                      >
                        <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </template>
              </draggable>

              <div
                v-if="!ranksByGameId[game.id]?.length"
                class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-8 text-slate-500"
              >
                <UIcon name="i-heroicons-information-circle" class="mb-2 h-8 w-8 opacity-20" />
                <p class="text-xs">Aucun rang configuré pour ce jeu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="!games.length" class="py-12 text-center text-sm text-slate-500">
        Aucun jeu pour le moment.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import draggable from "vuedraggable";

type AdminGame = {
  id: string;
  name: string;
  slug: string;
  icon_url?: string | null;
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
const loadingIconByGame = ref<Record<string, boolean>>({});
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// État pour les accordéons (jeux ouverts)
const expandedGames = ref<Record<string, boolean>>({});

const toggleGameExpansion = (gameId: string) => {
  expandedGames.value[gameId] = !expandedGames.value[gameId];
};

// État pour l'édition des noms de rangs
const editingRankId = ref<string | null>(null);
const editingRankLabel = ref("");

const startEditingRank = (rank: GameRank) => {
  editingRankId.value = rank.id;
  editingRankLabel.value = rank.label;
};

const cancelEditingRank = () => {
  editingRankId.value = null;
  editingRankLabel.value = "";
};

const onRenameRank = async (rankId: string, gameId: string) => {
  const newLabel = editingRankLabel.value.trim();
  if (!newLabel) return;

  await withGameLoading(gameId, async () => {
    try {
      const { error } = await (client as any)
        .from("game_ranks")
        .update({ label: newLabel })
        .eq("id", rankId);

      if (error) throw error;

      // Mise à jour locale
      ranks.value = ranks.value.map((r) =>
        r.id === rankId ? { ...r, label: newLabel } : r,
      );
      editingRankId.value = null;
      successMessage.value = "Rang renommé.";
      setTimeout(() => (successMessage.value = null), 3000);
    } catch (e) {
      errorMessage.value = "Erreur lors du renommage.";
    }
  });
};

const ranksByGameId = computed<Record<string, GameRank[]>>(() => {
  const map: Record<string, GameRank[]> = {};

  for (const rank of ranks.value) {
    const gameRanks = map[rank.game_id] ?? [];
    gameRanks.push(rank);
    map[rank.game_id] = gameRanks;
  }

  for (const gameRanks of Object.values(map)) {
    gameRanks.sort((a, b) => a.sort_order - b.sort_order);
  }

  return map;
});

// Fonction pour mettre à jour l'ordre après drag & drop
const onRankReorder = async (gameId: string) => {
  // Filtrer les rangs du jeu concerné dans l'ordre actuel de la liste 'ranks'
  const gameRanks = ranks.value.filter(r => r.game_id === gameId);
  if (!gameRanks.length) return;

  const updates = gameRanks.map((rank, index) => ({
    id: rank.id,
    sort_order: index + 1,
  }));

  try {
    // Mise à jour en base de données
    for (const update of updates) {
      await (client as any)
        .from("game_ranks")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
    
    successMessage.value = "Ordre des rangs mis à jour.";
    setTimeout(() => (successMessage.value = null), 3000);
    
    // Recharger les données pour s'assurer que tout est synchro
    await loadData();
  } catch (e) {
    errorMessage.value = "Erreur lors de la mise à jour de l'ordre.";
    await loadData();
  }
};

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
        .select("id,name,slug,icon_url")
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

const withGameIconLoading = async (
  gameId: string,
  callback: () => Promise<void>,
) => {
  loadingIconByGame.value = { ...loadingIconByGame.value, [gameId]: true };
  try {
    await callback();
  } finally {
    loadingIconByGame.value = { ...loadingIconByGame.value, [gameId]: false };
  }
};

const onUploadGameIcon = async (event: Event, game: AdminGame) => {
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

  await withGameIconLoading(game.id, async () => {
    const extension = getFileExtension(file);
    const objectPath = `icons/${game.id}-${Math.random().toString(36).substring(2)}.${extension}`;

    const { error: uploadError } = await (client as any).storage
      .from("game-icons")
      .upload(objectPath, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      errorMessage.value = "Impossible d'uploader l'icône du jeu.";
      return;
    }

    const { data: publicData } = (client as any).storage
      .from("game-icons")
      .getPublicUrl(objectPath);
    const iconUrl = `${publicData?.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await (client as any)
      .from("games")
      .update({ icon_url: iconUrl })
      .eq("id", game.id);

    if (updateError) {
      errorMessage.value =
        "Icône uploadée, mais impossible de l'enregistrer en base.";
      return;
    }

    successMessage.value = "Icône du jeu mise à jour.";
    await loadData();
  });
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
    const iconUrl = `${publicData?.publicUrl}?t=${Date.now()}`;

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
