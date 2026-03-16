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
  const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
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

<template>
  <NuxtLink
    :to="`/sessions/${game.slug}`"
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-teal-500/10"
  >
    <!-- Image / Gradient -->
    <div
      class="relative h-32 w-full shrink-0 overflow-hidden sm:h-40"
      :style="{ background: cardGradient }"
    >
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,transparent_50%)]" />
      <!-- Coach count badge -->
      <div v-if="coachCount !== null" class="absolute bottom-2 right-2">
        <span class="rounded-full bg-black/40 px-2 py-0.5 text-[0.65rem] font-bold text-white/90 backdrop-blur-sm">
          {{ coachCount }} coach{{ coachCount !== 1 ? "s" : "" }}
        </span>
      </div>
    </div>

    <!-- Info -->
    <div class="flex flex-1 flex-col justify-center gap-0.5 border-t border-white/5 p-4">
      <h2 class="text-sm font-black text-white transition-colors group-hover:text-teal-300 sm:text-base">
        {{ game.name }}
      </h2>
      <p class="text-[0.65rem] font-bold uppercase tracking-widest text-slate-600">
        {{ game.slug }}
      </p>
    </div>
  </NuxtLink>
</template>
