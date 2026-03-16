<script setup lang="ts">
const props = defineProps<{
  offer: PublicCoachingOffer;
  gameName: string;
}>();

// Split multi-line descriptions into feature bullets
const features = computed(() => {
  if (!props.offer.description) return [];
  const lines = props.offer.description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines : [];
});

const descriptionText = computed(() =>
  features.value.length === 0 ? props.offer.description : "",
);
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f19]/40 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-teal-500/40 hover:shadow-[0_20px_50px_rgba(20,184,166,0.15)]"
  >
    <!-- Premium Glow Effect -->
    <div class="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

    <div class="relative flex flex-1 flex-col p-8">
      <!-- Header: Price & Label -->
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <div v-if="offer.hourlyRate !== null" class="flex items-baseline gap-1">
            <span class="text-4xl font-black tracking-tight text-white">
              {{ offer.hourlyRate }}€
            </span>
            <span class="text-xs font-bold uppercase tracking-widest text-slate-500">/heure</span>
          </div>
          <div v-else class="text-xl font-black text-slate-400 uppercase tracking-tight">
            Sur mesure
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/80">
            Session Individuelle
          </p>
        </div>
        
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 group-hover:bg-teal-500/20 group-hover:text-teal-400 transition-colors">
          <UIcon name="i-heroicons-bolt" class="h-6 w-6" />
        </div>
      </div>

      <!-- Divider -->
      <div class="my-6 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

      <!-- Content: Description or Features -->
      <div class="flex-1 space-y-4">
        <p
          v-if="descriptionText"
          class="text-sm leading-relaxed text-slate-400 line-clamp-4"
        >
          {{ descriptionText }}
        </p>
        <ul v-else-if="features.length" class="space-y-3">
          <li
            v-for="(feat, i) in features"
            :key="i"
            class="flex items-start gap-3 text-sm text-slate-300"
          >
            <div class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
              <UIcon name="i-heroicons-check" class="h-3 w-3" />
            </div>
            <span class="leading-tight">{{ feat }}</span>
          </li>
        </ul>
        <p v-else class="text-sm italic text-slate-600">Aucun détail supplémentaire.</p>
      </div>

      <!-- Footer: CTA -->
      <div class="mt-8">
        <button
          class="group/btn relative w-full overflow-hidden rounded-2xl bg-white/5 py-4 text-sm font-black tracking-widest text-white transition-all duration-300 hover:bg-teal-500 hover:text-slate-950 active:scale-95"
        >
          <span class="relative z-10 flex items-center justify-center gap-2">
            RÉSERVER MAINTENANT
            <UIcon name="i-heroicons-arrow-right" class="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </span>
          <!-- Hover Background Animation -->
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-teal-400 to-teal-500 transition-transform duration-500 group-hover/btn:translate-x-0" />
        </button>
      </div>
    </div>
  </div>
</template>
