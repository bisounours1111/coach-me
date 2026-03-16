<template>
  <div class="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
    <div class="mx-auto w-full max-w-4xl">
      <header class="mb-8 space-y-1">
        <p
          class="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-indigo-400"
        >
          CoachMe · Mes sessions
        </p>
        <h1 class="text-2xl font-semibold sm:text-3xl">Dashboard élève</h1>
        <p class="text-sm text-slate-300/85">
          Retrouve toutes tes sessions de coaching ici.
        </p>
      </header>

      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'rounded-full px-3 py-1 text-xs font-medium transition',
            activeTab === tab.key
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-800/70 text-slate-400 hover:bg-slate-700/70 hover:text-slate-200',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="ml-1 opacity-60"
            >({{ tab.count }})</span
          >
        </button>
      </div>

      <div v-if="loading" class="text-sm text-slate-400">
        Chargement de tes sessions…
      </div>

      <div
        v-else-if="error"
        class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
      >
        {{ error }}
      </div>

      <div
        v-else-if="filteredSessions.length === 0"
        class="rounded-2xl border border-white/10 bg-[#020617]/80 p-10 text-center"
      >
        <p class="text-sm text-slate-400">
          {{
            activeTab === "all"
              ? "Tu n'as pas encore de session."
              : "Aucune session dans cette catégorie."
          }}
        </p>
        <NuxtLink
          v-if="activeTab === 'all'"
          to="/sessions"
          class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          Trouver un coach
        </NuxtLink>
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2">
        <SessionCard
          v-for="session in filteredSessions"
          :key="session.id"
          :session="session"
          role="student"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionListItem } from "~/types/session";

definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "student",
});

useHead({ title: "Dashboard élève · CoachMe" });

const { sessions, loading, error, fetchAsStudent } = useSessions();

type TabKey = "all" | "upcoming" | "pending" | "done" | "canceled";
const activeTab = ref<TabKey>("all");

const filteredSessions = computed<SessionListItem[]>(() => {
  switch (activeTab.value) {
    case "upcoming":
      return sessions.value.filter((s) =>
        ["upcoming", "paid"].includes(s.status),
      );
    case "pending":
      return sessions.value.filter((s) => s.status === "pending");
    case "done":
      return sessions.value.filter((s) => s.status === "done");
    case "canceled":
      return sessions.value.filter((s) => s.status === "canceled");
    default:
      return sessions.value;
  }
});

const tabs = computed(() => [
  { key: "all" as TabKey, label: "Toutes", count: sessions.value.length },
  {
    key: "upcoming" as TabKey,
    label: "À venir",
    count: sessions.value.filter((s) =>
      ["upcoming", "paid"].includes(s.status),
    ).length,
  },
  {
    key: "pending" as TabKey,
    label: "En attente",
    count: sessions.value.filter((s) => s.status === "pending").length,
  },
  {
    key: "done" as TabKey,
    label: "Terminées",
    count: sessions.value.filter((s) => s.status === "done").length,
  },
  {
    key: "canceled" as TabKey,
    label: "Annulées",
    count: sessions.value.filter((s) => s.status === "canceled").length,
  },
]);

onMounted(fetchAsStudent);
</script>
