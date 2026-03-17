<script setup lang="ts">
const props = defineProps<{
  game: PublicProfileGame;
}>();

const palette = [
  { from: "from-blue-500", to: "to-indigo-600", glow: "rgba(99, 102, 241, 0.2)" },
  { from: "from-teal-500", to: "to-cyan-600", glow: "rgba(20, 184, 166, 0.2)" },
  { from: "from-purple-500", to: "to-violet-600", glow: "rgba(168, 85, 247, 0.2)" },
  { from: "from-orange-500", to: "to-red-600", glow: "rgba(249, 115, 22, 0.2)" },
  { from: "from-pink-500", to: "to-rose-600", glow: "rgba(236, 72, 153, 0.2)" },
] as const;

const color = computed(() => {
  let h = 0;
  for (let i = 0; i < props.game.gameName.length; i++) {
    h = (Math.imul(31, h) + props.game.gameName.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(h) % palette.length];
});
</script>

<template>
  <div
    class="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
  >
    <!-- Game Icon/Letter -->
    <div
      v-if="game.gameIconUrl"
      class="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg transition-transform duration-500 group-hover:scale-110"
    >
      <img :src="game.gameIconUrl" :alt="game.gameName" class="h-full w-full object-cover" />
    </div>
    <div
      v-else
      :class="[
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white shadow-lg transition-transform duration-500 group-hover:scale-110',
        color.from,
        color.to
      ]"
    >
      {{ game.gameName.charAt(0).toUpperCase() }}
    </div>

    <!-- Info -->
    <div class="min-w-0 flex-1">
      <h4 class="truncate text-sm font-bold text-white group-hover:text-teal-400 transition-colors">
        {{ game.gameName }}
      </h4>
      <div class="flex items-center gap-1.5">
        <img
          v-if="game.playerRankIconUrl"
          :src="game.playerRankIconUrl"
          class="h-3.5 w-3.5 object-contain"
        />
        <p class="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {{ game.playerRankLabel || 'Sans rang' }}
        </p>
      </div>
    </div>

    <!-- Coach Indicator -->
    <div v-if="game.isCoach" class="pr-1">
      <div class="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
    </div>
    
    <!-- Hover Background Glow -->
    <div 
      class="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
      :style="{ backgroundColor: color.glow }"
    />
  </div>
</template>
