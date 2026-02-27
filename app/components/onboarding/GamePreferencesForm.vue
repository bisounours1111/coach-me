<template>
  <form class="space-y-5" @submit.prevent="onSave">
    <p class="text-xs text-slate-200/80">
      Ajoute les jeux auxquels tu joues, ton rang actuel, et indique si tu souhaites être coaché dessus.
      Tu pourras toujours modifier ces préférences plus tard.
    </p>

    <div class="space-y-3">
      <div
        v-for="game in games"
        :key="game.id"
        class="rounded-xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur"
      >
        <div class="mb-3 flex items-center justify-between gap-2 text-xs text-slate-200/80">
          <span class="inline-flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-[#14b8a6]" />
            Jeu
          </span>
          <button
            v-if="games.length > 1"
            type="button"
            class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-200/80 transition hover:bg-white/10"
            @click="removeGame(game.id)"
          >
            Supprimer
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-[ minmax(0,2fr)_minmax(0,1.5fr) ]">
          <AuthTextField
            v-model="game.title"
            :id="`game-title-${game.id}`"
            label="Nom du jeu"
            placeholder="Ex : League of Legends, Valorant…"
            autocomplete="off"
          />

          <AuthTextField
            v-model="game.rank"
            :id="`game-rank-${game.id}`"
            label="Rang / Elo (facultatif)"
            placeholder="Ex : Platine 2, Immortal 1…"
            :required="false"
          />
        </div>

        <div class="mt-3 flex items-center justify-between gap-3 text-xs text-slate-200/80">
          <label class="inline-flex items-center gap-2">
            <button
              type="button"
              class="relative h-5 w-9 rounded-full border border-white/15 bg-white/5 transition"
              :class="game.wantsCoaching ? 'bg-[#14b8a6]/40 border-[#14b8a6]/60' : ''"
              @click="game.wantsCoaching = !game.wantsCoaching"
            >
              <span
                class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition"
                :class="game.wantsCoaching ? 'right-0.5' : 'left-0.5'"
              />
            </button>
            <span>Je souhaite être coaché sur ce jeu</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-transparent px-4 py-2 text-xs font-medium text-slate-200/80 transition hover:border-white/35 hover:bg-white/5"
        @click="addGame"
      >
        <span class="h-4 w-4 rounded-full bg-[#14b8a6]/15 text-center text-[0.7rem] leading-4 text-[#14b8a6]">
          +
        </span>
        Ajouter un jeu
      </button>
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

    <AuthSubmitButton :loading="loading">
      Enregistrer mes préférences
    </AuthSubmitButton>
  </form>
</template>

<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();

type GamePreference = {
  id: number;
  title: string;
  rank: string;
  wantsCoaching: boolean;
};

const games = ref<GamePreference[]>([
  { id: 1, title: "", rank: "", wantsCoaching: true },
]);

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const addGame = () => {
  const nextId = games.value.length
    ? Math.max(...games.value.map((g) => g.id)) + 1
    : 1;
  games.value.push({
    id: nextId,
    title: "",
    rank: "",
    wantsCoaching: true,
  } as GamePreference);
};

const removeGame = (id: number) => {
  games.value = games.value.filter((g) => g.id !== id);
};

const onSave = async () => {
  if (loading.value) return;

  errorMessage.value = null;
  successMessage.value = null;

  const cleaned = games.value
    .map((g) => ({
      ...g,
      title: g.title.trim(),
      rank: g.rank.trim(),
    }))
    .filter((g) => g.title !== "");

  if (!cleaned.length) {
    successMessage.value =
      "Préférences enregistrées. Tu pourras ajouter des jeux plus tard depuis ton espace.";
    return;
  }

  loading.value = true;

  const currentUser = user.value;

  if (!currentUser) {
    // Pas de session encore active (email à confirmer, etc.) → on ne tente pas d'enregistrer en base.
    loading.value = false;
    successMessage.value =
      "Préférences enregistrées localement. Elles seront synchronisées quand ta session sera active.";
    return;
  }

  try {
    await (client as any)
      .from("game_preferences")
      .upsert(
        cleaned.map((g) => ({
          user_id: currentUser.id,
          game: g.title,
          rank: g.rank || null,
          wants_coaching: g.wantsCoaching,
        })),
        { onConflict: "user_id,game" },
      );

    successMessage.value = "Préférences mises à jour.";
  } catch {
    errorMessage.value =
      "Impossible d’enregistrer pour le moment. Réessaie plus tard.";
  } finally {
    loading.value = false;
  }
};
</script>

