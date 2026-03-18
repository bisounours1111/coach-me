<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "coach",
});

useHead({
  title: "Mes sessions · CoachMe",
});

const { getSessions } = useSessions();
const { openWithCoach } = useMessagingPanel();

const loading = ref(true);
const sessions = ref<any[]>([]);
const activeTab = ref<"upcoming" | "completed" | "all_upcoming">("upcoming");

const upcomingSessions = computed(() => {
  const now = Date.now();
  return sessions.value
    .filter((s: any) => Date.parse(s.start_at) >= now)
    .sort((a: any, b: any) => Date.parse(a.start_at) - Date.parse(b.start_at));
});

const completedSessions = computed(() => {
  const now = Date.now();
  return sessions.value
    .filter((s: any) => Date.parse(s.start_at) < now)
    .sort((a: any, b: any) => Date.parse(b.start_at) - Date.parse(a.start_at));
});

const allUpcomingSessions = computed(() => {
  return sessions.value
    .filter((s: any) => s.status === "upcoming")
    .sort((a: any, b: any) => Date.parse(a.start_at) - Date.parse(b.start_at));
});

const currentSessions = computed(() => {
  if (activeTab.value === "upcoming") return upcomingSessions.value;
  if (activeTab.value === "completed") return completedSessions.value;
  if (activeTab.value === "all_upcoming") return allUpcomingSessions.value;
  return [];
});

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const contactStudent = (studentId: string) => {
  openWithCoach(studentId);
};

onMounted(async () => {
  try {
    const all = await getSessions("coach");
    // On ne garde que les sessions qui ne sont pas annulées
    sessions.value = all.filter((s: any) => s.status !== "canceled");

    // Définir l'onglet actif par défaut sur le premier qui contient des données
    if (upcomingSessions.value.length > 0) {
      activeTab.value = "upcoming";
    } else if (allUpcomingSessions.value.length > 0) {
      activeTab.value = "all_upcoming";
    } else if (completedSessions.value.length > 0) {
      activeTab.value = "completed";
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <header class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NuxtLink
          to="/dashboard/coach"
          class="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-teal-400"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-3.5 w-3.5" />
          Retour au dashboard
        </NuxtLink>
        <h1 class="mt-4 text-3xl font-black text-white md:text-4xl">
          Mes <span class="text-teal-400">sessions</span>
        </h1>
        <p class="mt-2 text-sm text-slate-400">
          Retrouvez l'historique et le planning de vos réservations.
        </p>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500" />
    </div>

    <template v-else>
      <!-- Tabs Selector -->
      <div class="mb-10 flex flex-wrap gap-3">
        <button
          @click="activeTab = 'upcoming'"
          :disabled="upcomingSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'upcoming' 
            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' 
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
          À VENIR
          <span class="ml-1 opacity-60">({{ upcomingSessions.length }})</span>
        </button>

        <button
          @click="activeTab = 'all_upcoming'"
          :disabled="allUpcomingSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'all_upcoming' 
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-clock" class="h-4 w-4" />
          RESERVATIONS
          <span class="ml-1 opacity-60">({{ allUpcomingSessions.length }})</span>
        </button>

        <button
          @click="activeTab = 'completed'"
          :disabled="completedSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'completed' 
            ? 'bg-slate-700 text-white shadow-lg shadow-slate-900/20' 
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-check-circle" class="h-4 w-4" />
          TERMINÉ
          <span class="ml-1 opacity-60">({{ completedSessions.length }})</span>
        </button>
      </div>

      <div v-if="sessions.length === 0" class="rounded-3xl border border-white/5 bg-white/[0.02] p-20 text-center">
        <UIcon name="i-heroicons-calendar" class="mx-auto h-16 w-16 text-slate-700" />
        <h2 class="mt-6 text-xl font-bold text-white">Aucune session</h2>
        <p class="mt-2 text-slate-500">Vous n'avez pas encore de réservations prévues.</p>
      </div>

      <div v-else class="grid gap-6">
        <div
          v-for="s in currentSessions"
          :key="s.id"
          class="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-white/10 hover:bg-white/[0.04]"
          :class="{ 'opacity-70': activeTab === 'completed' }"
        >
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-6">
              <div 
                class="flex h-14 w-14 items-center justify-center rounded-2xl"
                :class="activeTab === 'completed' ? 'bg-white/5 text-slate-500' : 'bg-teal-500/10 text-teal-400'"
              >
                <UIcon :name="activeTab === 'completed' ? 'i-heroicons-check-circle' : 'i-heroicons-academic-cap'" class="h-8 w-8" />
              </div>
              <div>
                <h3 class="text-lg font-black text-white">{{ s.game || "Coaching" }}</h3>
                <p class="text-sm text-slate-400">{{ formatDateTime(s.start_at) }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-500">Élève :</span>
                  <span class="text-xs font-black text-teal-400">{{ s.student_name ?? "—" }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-right sm:mr-6">
                <p v-if="s.status !== 'paid'" class="text-xs font-black uppercase tracking-widest text-slate-500">{{ s.status }}</p>
                <p class="text-xl font-black text-white">{{ Number(s.price).toFixed(0) }}€</p>
              </div>
              <button
                @click="contactStudent(s.student_id)"
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400 transition hover:bg-teal-500 hover:text-slate-950 active:scale-95"
                title="Contacter l'élève"
              >
                <UIcon name="i-heroicons-chat-bubble-left-right" class="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
