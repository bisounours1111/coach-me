<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold',
      statusClass,
    ]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="dotClass" />
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import type { SessionStatus } from "~/types/session";
import { SESSION_STATUS_LABEL, SESSION_STATUS_CLASS } from "~/types/session";

const props = defineProps<{ status: SessionStatus }>();

const statusLabel = computed(() => SESSION_STATUS_LABEL[props.status]);
const statusClass = computed(() => SESSION_STATUS_CLASS[props.status]);

const dotClass = computed(() => {
  const map: Record<SessionStatus, string> = {
    pending: "bg-amber-300",
    paid: "bg-indigo-300",
    upcoming: "bg-teal-300",
    done: "bg-slate-400",
    canceled: "bg-red-400",
  };
  return map[props.status];
});
</script>
