<template>
  <div class="relative w-full max-w-md">
    <div class="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#6366f1]/55 to-[#14b8a6]/45 blur-sm" />
    <div class="relative rounded-2xl border border-white/10 bg-[#0b0f19]/70 p-6 shadow-2xl shadow-black/70 backdrop-blur">
      <div class="mb-6 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#14b8a6]/90">
          {{ brand }}
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-2 text-xs text-slate-300/80">
          {{ subtitle }}
        </p>
      </div>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    brand?: string;
    title: string;
    subtitle?: string;
  }>(),
  {
    brand: "Coach Me",
    subtitle: undefined,
  },
);
</script>

