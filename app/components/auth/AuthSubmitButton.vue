<template>
  <button
    type="submit"
    :disabled="disabled || loading"
    class="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#6366f1] to-[#14b8a6] p-[1px] transition disabled:cursor-not-allowed disabled:opacity-60"
  >
    <span class="block rounded-[0.70rem] bg-[#0b0f19]/70 px-4 py-3 text-sm font-semibold text-slate-50 backdrop-blur transition group-hover:bg-[#0b0f19]/55">
      <span class="inline-flex items-center justify-center gap-2">
        <span
          v-if="loading"
          class="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/80"
        />
        <slot>Continuer</slot>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    loading: false,
    disabled: false,
  },
);
</script>

