<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3"
    >
      <p class="text-[0.65rem] uppercase tracking-wide text-slate-500">
        {{ stat.label }}
      </p>
      <p :class="['mt-1 text-xl font-semibold', stat.color]">
        {{ stat.value }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionListItem } from "~/types/session";

const props = defineProps<{ sessions: SessionListItem[] }>();

const stats = computed(() => [
  {
    label: "À venir",
    value: props.sessions.filter((s) =>
      ["upcoming", "paid"].includes(s.status),
    ).length,
    color: "text-teal-300",
  },
  {
    label: "En attente",
    value: props.sessions.filter((s) => s.status === "pending").length,
    color: "text-amber-300",
  },
  {
    label: "Terminées",
    value: props.sessions.filter((s) => s.status === "done").length,
    color: "text-slate-300",
  },
  {
    label: "Total",
    value: props.sessions.length,
    color: "text-indigo-300",
  },
]);
</script>
