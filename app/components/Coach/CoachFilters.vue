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

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div v-if="showGameSelect" class="shrink-0">
      <select
        v-model="internalGameSlug"
        class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-500/40 sm:w-48"
      >
        <option value="">Choisir un jeu…</option>
        <option v-for="game in games" :key="game.id" :value="game.slug">
          {{ game.name }}
        </option>
      </select>
    </div>

    <div class="relative flex-1">
      <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        :value="searchText"
        type="text"
        placeholder="Rechercher par nom ou bio…"
        class="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-teal-500/40 focus:bg-white/[0.07]"
        @input="onInput"
      />
    </div>
  </div>
</template>
