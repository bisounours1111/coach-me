<template>
  <div class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-slate-50">Rechercher un coach</p>
        <p class="text-xs text-slate-300/80">
          {{ showGameSelect ? 'Choisis un jeu puis filtre par nom ou bio.' : 'Filtre par nom ou bio.' }}
        </p>
      </div>
      <div v-if="showGameSelect" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          v-model="internalGameSlug"
          class="w-full rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-[#14b8a6]/60 sm:w-48"
        >
          <option value="">Choisir un jeu…</option>
          <option
            v-for="game in games"
            :key="game.id"
            :value="game.slug"
          >
            {{ game.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <input
          :value="searchText"
          type="text"
          placeholder="Rechercher par nom ou bio…"
          class="w-full rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400/70 outline-none transition focus:border-[#14b8a6]/60"
          @input="onInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface GameOption {
  id: string;
  slug: string;
  name: string;
}

const props = withDefaults(
  defineProps<{
    games: GameOption[];
    selectedGameSlug: string | null;
    searchText: string;
    showGameSelect?: boolean;
  }>(),
  { showGameSelect: true },
);

const emit = defineEmits<{
  (e: "update:gameSlug", value: string | null): void;
  (e: "update:searchText", value: string): void;
}>();

const internalGameSlug = ref<string>(props.selectedGameSlug ?? "");

watch(
  () => props.selectedGameSlug,
  (value) => {
    internalGameSlug.value = value ?? "";
  },
);

watch(internalGameSlug, (value) => {
  emit("update:gameSlug", value || null);
});

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:searchText", target?.value ?? "");
};
</script>
