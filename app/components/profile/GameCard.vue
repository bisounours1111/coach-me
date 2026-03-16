<script setup lang="ts">
const props = defineProps<{
  game: PublicProfileGame;
}>();

const palette = [
  { from: "from-blue-600", to: "to-indigo-700", glow: "#6366f133" },
  { from: "from-teal-600", to: "to-cyan-700", glow: "#14b8a633" },
  { from: "from-purple-600", to: "to-violet-700", glow: "#a855f733" },
  { from: "from-orange-600", to: "to-red-700", glow: "#f9731633" },
  { from: "from-green-600", to: "to-emerald-700", glow: "#22c55e33" },
  { from: "from-pink-600", to: "to-rose-700", glow: "#ec489933" },
  { from: "from-amber-600", to: "to-yellow-700", glow: "#f59e0b33" },
  { from: "from-sky-600", to: "to-blue-700", glow: "#0ea5e933" },
] as const;

const fallbackColor = palette[0];

const color = computed(() => {
  let h = 0;
  for (let i = 0; i < props.game.gameName.length; i++) {
    h = (Math.imul(31, h) + props.game.gameName.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(h) % palette.length] ?? fallbackColor;
});
</script>

<template>
  <div
    class="group relative cursor-default overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-white/15 hover:bg-white/[0.06]"
  >
    <!-- Hover glow -->
    <div
      class="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      :style="`background: radial-gradient(ellipse at 50% 0%, ${color.glow}, transparent 70%)`"
    />

    <div class="relative flex items-center gap-3">
      <!-- Icon -->
      <div
        :class="`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color.from} ${color.to} text-lg font-black text-white shadow-lg`"
      >
        {{ game.gameName.charAt(0).toUpperCase() }}
      </div>

      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-slate-200">
          {{ game.gameName }}
        </div>
        <div class="mt-0.5 text-xs">
          <span v-if="game.playerRankLabel" class="text-slate-400">
            {{ game.playerRankLabel }}
          </span>
          <span v-else class="text-slate-600 italic">Non renseigné</span>
        </div>
      </div>

      <!-- Coach badge -->
      <div v-if="game.isCoach" class="flex-shrink-0">
        <span
          class="rounded border border-teal-500/35 bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-400"
        >
          Coach
        </span>
      </div>
    </div>
  </div>
</template>
