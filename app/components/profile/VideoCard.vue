<script setup lang="ts">
const props = defineProps<{
  videoUrl: string;
}>();

const youtubeId = computed(() => {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = props.videoUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
});

const thumbnailUrl = computed(() =>
  youtubeId.value
    ? `https://img.youtube.com/vi/${youtubeId.value}/hqdefault.jpg`
    : null,
);
</script>

<template>
  <a
    :href="videoUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="group relative block aspect-video overflow-hidden rounded-xl border border-white/8 bg-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
  >
    <!-- Thumbnail -->
    <img
      v-if="thumbnailUrl"
      :src="thumbnailUrl"
      alt="Aperçu vidéo"
      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"
    >
      <UIcon name="i-heroicons-video-camera" class="h-10 w-10 text-slate-600" />
    </div>

    <!-- Dark overlay -->
    <div
      class="absolute inset-0 bg-black/35 transition-colors duration-300 group-hover:bg-black/15"
    />

    <!-- Play button -->
    <div class="absolute inset-0 flex items-center justify-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/25"
      >
        <UIcon
          name="i-heroicons-play-solid"
          class="ml-0.5 h-5 w-5 text-white"
        />
      </div>
    </div>

    <!-- YouTube badge -->
    <div
      v-if="youtubeId"
      class="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 backdrop-blur-sm"
    >
      <!-- YouTube SVG icon inline -->
      <svg
        viewBox="0 0 24 24"
        class="h-3 w-3 fill-red-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        />
      </svg>
      <span class="text-[10px] font-bold text-white">YouTube</span>
    </div>

    <!-- External link icon (non-YouTube) -->
    <div v-else class="absolute right-2.5 top-2.5">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm"
      >
        <UIcon
          name="i-heroicons-arrow-top-right-on-square"
          class="h-3.5 w-3.5 text-slate-300"
        />
      </div>
    </div>
  </a>
</template>
