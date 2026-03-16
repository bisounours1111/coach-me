<template>
  <div class="space-y-3">
    <div
      v-for="(game, index) in localGames"
      :key="index"
      class="rounded-xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur"
    >
      <div
        class="mb-3 flex items-center justify-between gap-2 text-xs text-slate-200/80"
      >
        <span class="inline-flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
          Jeu {{ index + 1 }}
        </span>
        <button
          v-if="localGames.length > 1"
          type="button"
          class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-200/80 transition hover:bg-white/10"
          @click="remove(index)"
        >
          Supprimer
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90">Jeu</label>
          <input
            v-model="localGames[index].name"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#6366f1]/50 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
            placeholder="Ex : Valorant, LoL…"
            autocomplete="off"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90"
            >Rang (facultatif)</label
          >
          <input
            v-model="localGames[index].rank"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#6366f1]/50 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
            placeholder="Ex : Diamant…"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-transparent px-4 py-2 text-xs font-medium text-slate-200/80 transition hover:border-white/35 hover:bg-white/5"
      @click="add"
    >
      <span
        class="h-4 w-4 rounded-full bg-[#6366f1]/15 text-center text-[0.7rem] leading-4 text-[#6366f1]"
      >
        +
      </span>
      Ajouter un jeu
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Game } from "~/types/profile";

const props = withDefaults(
  defineProps<{
    modelValue?: Game[];
  }>(),
  {
    modelValue: () => [{ name: "", rank: "" }],
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: Game[]): void;
}>();

const localGames = computed({
  get: () => props.modelValue ?? [{ name: "", rank: "" }],
  set: (value: Game[]) => emit("update:modelValue", value),
});

const add = () => {
  localGames.value = [...localGames.value, { name: "", rank: "" }];
};

const remove = (index: number) => {
  const copy = [...localGames.value];
  copy.splice(index, 1);
  localGames.value = copy.length ? copy : [{ name: "", rank: "" }];
};
</script>
