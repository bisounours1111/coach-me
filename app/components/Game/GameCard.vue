<template>
  <NuxtLink
    :to="`/sessions/${game.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19]/80 shadow-lg shadow-black/40 transition hover:-translate-y-1 hover:border-indigo-400/70 hover:shadow-indigo-500/30"
  >
    <div
      class="relative h-32 w-full shrink-0 overflow-hidden sm:h-40"
      :style="{ background: cardGradient }"
    >
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,transparent_50%)]" />
      <div class="absolute bottom-2 left-2 right-2 text-right">
        <span
          v-if="coachCount !== null"
          class="text-[0.65rem] font-medium text-white/90 drop-shadow"
        >
          {{ coachCount }} coach{{ coachCount !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>
    <div class="flex flex-1 flex-col justify-center gap-1 border-t border-white/5 bg-[#020617]/70 p-4">
      <h2 class="text-sm font-semibold text-slate-50 group-hover:text-indigo-200 sm:text-base">
        {{ game.name }}
      </h2>
      <p class="text-[0.65rem] uppercase tracking-wider text-slate-400">
        {{ game.slug }}
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Game {
  id: string;
  slug: string;
  name: string;
}

const props = withDefaults(
  defineProps<{
    game: Game;
    coachCount?: number | null;
  }>(),
  { coachCount: null },
);

const cardGradient = computed(() => {
  const slug = props.game.slug;
  const hash = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [
    [260, 180],
    [340, 280],
    [160, 220],
    [30, 50],
    [200, 260],
    [140, 100],
  ];
  const [h1, h2] = hues[hash % hues.length]!;
  return `linear-gradient(135deg, hsl(${h1}, 55%, 35%) 0%, hsl(${h2}, 50%, 25%) 100%)`;
});
</script>
