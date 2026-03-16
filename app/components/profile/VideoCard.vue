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
    ? `https://img.youtube.com/vi/${youtubeId.value}/maxresdefault.jpg`
    : null,
);
</script>

<template>
  <a
    :href="videoUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="group relative block aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition-all duration-500 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
  >
    <!-- Thumbnail -->
    <img
      v-if="thumbnailUrl"
      :src="thumbnailUrl"
      alt="Aperçu vidéo"
      class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      @error="
        (e: any) =>
          (e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`)
      "
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"
    >
      <UIcon name="i-heroicons-video-camera" class="h-12 w-12 text-slate-700" />
    </div>

    <!-- Overlay Gradients -->
    <div
      class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-40"
    />

    <!-- Play Button Center -->
    <div class="absolute inset-0 flex items-center justify-center">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 transition-all duration-500 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-slate-950 group-hover:ring-teal-400"
      >
        <UIcon name="i-heroicons-play-solid" class="ml-1 h-6 w-6" />
      </div>
    </div>

    <!-- Info Badge -->
    <div class="absolute bottom-4 left-4 flex items-center gap-2">
      <div
        v-if="youtubeId"
        class="flex items-center gap-1.5 rounded-lg bg-red-600 px-2 py-1 shadow-lg"
      >
        <UIcon name="i-simple-icons-youtube" class="h-3 w-3 text-white" />
        <span class="text-[10px] font-black uppercase text-white">Replay</span>
      </div>
      <div
        v-else
        class="flex items-center gap-1.5 rounded-lg bg-teal-600 px-2 py-1 shadow-lg"
      >
        <UIcon name="i-heroicons-link" class="h-3 w-3 text-white" />
        <span class="text-[10px] font-black uppercase text-white">Vidéo</span>
      </div>
    </div>
  </a>
</template>
