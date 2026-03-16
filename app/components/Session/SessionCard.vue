<template>
  <article
    class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#020617]/80 p-4 shadow-lg shadow-black/40"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100"
        >
          <img
            v-if="session.otherParty?.avatarUrl"
            :src="session.otherParty.avatarUrl"
            alt=""
            class="h-10 w-10 rounded-full object-cover"
          />
          <span v-else>{{ initials }}</span>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-50">
            {{
              session.otherParty?.fullName ||
              (role === "student" ? "Coach anonyme" : "Élève anonyme")
            }}
          </p>
          <p class="text-[0.7rem] text-slate-400">
            {{ session.game || "Jeu non précisé" }}
          </p>
        </div>
      </div>
      <SessionStatusBadge :status="session.status" />
    </header>

    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-300">
      <div>
        <p class="text-[0.65rem] uppercase tracking-wide text-slate-500">
          Date
        </p>
        <p>{{ formattedDate }}</p>
      </div>
      <div v-if="session.durationMinutes">
        <p class="text-[0.65rem] uppercase tracking-wide text-slate-500">
          Durée
        </p>
        <p>{{ session.durationMinutes }} min</p>
      </div>
      <div v-if="session.price != null">
        <p class="text-[0.65rem] uppercase tracking-wide text-slate-500">
          Prix
        </p>
        <p class="font-semibold text-emerald-300">
          {{ session.price.toFixed(2) }} {{ session.currency }}
        </p>
      </div>
    </div>

    <p
      v-if="session.notes"
      class="rounded-xl bg-slate-800/50 px-3 py-2 text-xs italic text-slate-400"
    >
      {{ session.notes }}
    </p>
  </article>
</template>

<script setup lang="ts">
import type { SessionListItem } from "~/types/session";

const props = defineProps<{
  session: SessionListItem;
  role: "student" | "coach";
}>();

const formattedDate = computed(() => {
  const date = new Date(props.session.startAt);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
});

const initials = computed(() => {
  const name = props.session.otherParty?.fullName;
  if (!name) return props.role === "student" ? "C" : "E";
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() ||
    (props.role === "student" ? "C" : "E")
  );
});
</script>
