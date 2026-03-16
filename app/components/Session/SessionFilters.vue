<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
        modelValue === tab.key
          ? 'bg-indigo-500 text-white shadow shadow-indigo-500/30'
          : 'bg-slate-800/70 text-slate-400 hover:bg-slate-700/70 hover:text-slate-200',
      ]"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span
        v-if="tab.count > 0"
        :class="[
          'rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold',
          modelValue === tab.key
            ? 'bg-white/20 text-white'
            : 'bg-slate-700 text-slate-300',
        ]"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SessionListItem } from "~/types/session";

type TabKey = "all" | "upcoming" | "pending" | "done" | "canceled";

const props = defineProps<{
  modelValue: TabKey;
  sessions: SessionListItem[];
}>();

defineEmits<{ "update:modelValue": [key: TabKey] }>();

const tabs = computed(() => [
  { key: "all" as TabKey, label: "Toutes", count: props.sessions.length },
  {
    key: "upcoming" as TabKey,
    label: "À venir",
    count: props.sessions.filter((s) =>
      ["upcoming", "paid"].includes(s.status),
    ).length,
  },
  {
    key: "pending" as TabKey,
    label: "En attente",
    count: props.sessions.filter((s) => s.status === "pending").length,
  },
  {
    key: "done" as TabKey,
    label: "Terminées",
    count: props.sessions.filter((s) => s.status === "done").length,
  },
  {
    key: "canceled" as TabKey,
    label: "Annulées",
    count: props.sessions.filter((s) => s.status === "canceled").length,
  },
]);
</script>
