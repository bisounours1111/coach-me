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

const previewVideos = computed(() => props.offer.videoUrls.slice(0, 3));
const extraVideos = computed(() =>
  Math.max(0, props.offer.videoUrls.length - 3),
);
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/30 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-teal-950/50"
  >
    <!-- Top gradient accent bar -->
    <div
      class="h-0.5 w-full bg-gradient-to-r from-teal-500 via-indigo-500 to-teal-500 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
    />

    <!-- Glow on hover -->
    <div
      class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style="
        background: radial-gradient(
          ellipse at 50% 0%,
          rgba(20, 184, 166, 0.07),
          transparent 60%
        );
      "
    />

    <div class="relative flex flex-1 flex-col gap-5 p-6">
      <!-- Rate section -->
      <div>
        <div v-if="offer.hourlyRate !== null" class="flex items-baseline gap-1">
          <span
            class="bg-gradient-to-r from-teal-300 to-teal-400 bg-clip-text text-4xl font-black text-transparent"
          >
            {{ offer.hourlyRate }}€
          </span>
          <span class="text-sm font-medium text-slate-400">/heure</span>
        </div>
        <div v-else class="text-base font-semibold italic text-slate-400">
          Tarif sur demande
        </div>
        <div class="mt-1 text-xs text-slate-600">Coaching · {{ gameName }}</div>
      </div>

      <!-- Separator -->
      <div
        class="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"
      />

      <!-- Description or features -->
      <div class="flex-1 space-y-2.5">
        <p
          v-if="descriptionText"
          class="text-sm leading-relaxed text-slate-400"
        >
          {{ descriptionText }}
        </p>
        <ul v-else-if="features.length" class="space-y-2">
          <li
            v-for="(feat, i) in features"
            :key="i"
            class="flex items-start gap-2.5 text-sm text-slate-300"
          >
            <span class="mt-0.5 flex-shrink-0 text-teal-400">✓</span>
            {{ feat }}
          </li>
        </ul>
        <p v-else class="text-sm italic text-slate-600">Pas de description.</p>
      </div>

      <!-- Video previews -->
      <div v-if="offer.videoUrls.length" class="space-y-2">
        <p class="text-xs font-medium text-slate-500">
          {{ offer.videoUrls.length }} vidéo{{
            offer.videoUrls.length > 1 ? "s" : ""
          }}
          incluse{{ offer.videoUrls.length > 1 ? "s" : "" }}
        </p>
        <div class="flex items-center gap-2">
          <a
            v-for="url in previewVideos"
            :key="url"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            class="group/v relative flex h-10 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-800 transition-all duration-200 hover:border-white/25 hover:brightness-125"
          >
            <UIcon
              name="i-heroicons-play-circle"
              class="h-5 w-5 text-slate-500 transition-colors group-hover/v:text-slate-300"
            />
          </a>
          <span v-if="extraVideos > 0" class="text-xs text-slate-600">
            +{{ extraVideos }}
          </span>
        </div>
      </div>

      <!-- CTA -->
      <button
        class="group/btn relative mt-auto w-full overflow-hidden rounded-xl border border-teal-500/25 bg-teal-500/8 py-3 text-sm font-bold text-teal-300 transition-all duration-300 hover:border-teal-400 hover:bg-teal-500 hover:text-white hover:shadow-lg hover:shadow-teal-500/20 active:scale-95"
      >
        <span class="relative z-10 flex items-center justify-center gap-2">
          <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
          Réserver ·
          <span class="font-black">
            {{
              offer.hourlyRate !== null
                ? `${offer.hourlyRate}€/h`
                : "Me contacter"
            }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
