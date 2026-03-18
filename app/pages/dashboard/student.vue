<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "student",
});

useHead({
  title: "Dashboard élève · CoachMe",
});

const user = useSupabaseUser();
const { getSessions } = useSessions();
const { getCoachProfile } = useCoachProfile();

const loading = ref(true);
const sessions = ref<any[]>([]);
const profileName = ref<string | null>(null);
const activeTab = ref<"upcoming" | "reservations" | "completed">("upcoming");

const displayName = computed(() => {
  if (profileName.value) return profileName.value;
  if (!user.value) return "Joueur";
  const metaName =
    user.value.user_metadata?.full_name || user.value.user_metadata?.name;
  if (metaName) return metaName;
  const email = user.value.email ?? "";
  return email.split("@")[0] || "Joueur";
});

const upcomingSessions = computed(() =>
  sessions.value
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
);

const reservationSessions = computed(() =>
  sessions.value
    .filter((s) => s.status === "paid")
    .sort((a, b) => Date.parse(b.start_at) - Date.parse(a.start_at))
);

const completedSessions = computed(() =>
  sessions.value
    .filter((s) => s.status === "done")
    .sort((a, b) => Date.parse(b.start_at) - Date.parse(a.start_at))
);

const currentSessions = computed(() => {
  if (activeTab.value === "upcoming") return upcomingSessions.value;
  if (activeTab.value === "reservations") return reservationSessions.value;
  if (activeTab.value === "completed") return completedSessions.value;
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

onMounted(async () => {
  try {
    if (user.value?.sub) {
      const profile = await getCoachProfile(user.value.sub);
      profileName.value = profile.fullName || null;
    }
    sessions.value = await getSessions("student");

    if (upcomingSessions.value.length > 0) {
      activeTab.value = "upcoming";
    } else if (reservationSessions.value.length > 0) {
      activeTab.value = "reservations";
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
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
          Espace élève
        </p>
        <h1 class="mt-2 text-3xl font-black text-white md:text-4xl">
          Bienvenue, <span class="text-teal-400">{{ displayName }}</span>
        </h1>
        <p class="mt-2 text-sm text-slate-400">
          Retrouvez l'historique et le planning de vos réservations.
        </p>
      </div>
      <NuxtLink
        to="/games"
        class="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
      >
        Trouver un coach
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500" />
    </div>

    <template v-else>
      <!-- Tabs -->
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
          @click="activeTab = 'reservations'"
          :disabled="reservationSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'reservations'
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-clock" class="h-4 w-4" />
          RÉSERVATIONS
          <span class="ml-1 opacity-60">({{ reservationSessions.length }})</span>
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

      <!-- Empty state -->
      <div v-if="sessions.length === 0" class="rounded-3xl border border-white/5 bg-white/[0.02] p-20 text-center">
        <UIcon name="i-heroicons-calendar" class="mx-auto h-16 w-16 text-slate-700" />
        <h2 class="mt-6 text-xl font-bold text-white">Aucune session</h2>
        <p class="mt-2 text-slate-500">Vous n'avez pas encore de réservations prévues.</p>
        <NuxtLink
          to="/games"
          class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
        >
          Trouver un coach
          <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
        </NuxtLink>
      </div>

      <!-- Sessions list -->
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
                <UIcon
                  :name="activeTab === 'completed' ? 'i-heroicons-check-circle' : 'i-heroicons-academic-cap'"
                  class="h-8 w-8"
                />
              </div>
              <div>
                <h3 class="text-lg font-black text-white">{{ s.game || "Coaching" }}</h3>
                <p class="text-sm text-slate-400">{{ formatDateTime(s.start_at) }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-500">Coach :</span>
                  <span class="text-xs font-black text-teal-400">{{ s.coach_name ?? "—" }}</span>
                </div>
              </div>
            </div>

            <div class="text-right sm:mr-6">
              <p v-if="s.status !== 'paid'" class="text-xs font-black uppercase tracking-widest text-slate-500">
                {{ s.status }}
              </p>
              <p class="text-xl font-black text-white">{{ Number(s.price).toFixed(0) }}€</p>
            </div>
          </div>
        </div>

        <!-- Tab empty state -->
        <div
          v-if="currentSessions.length === 0"
          class="rounded-3xl border border-white/5 bg-white/[0.02] p-16 text-center"
        >
          <UIcon name="i-heroicons-calendar" class="mx-auto h-12 w-12 text-slate-700" />
          <p class="mt-4 text-slate-500">Aucune session dans cette catégorie.</p>
        </div>
      </div>
    </template>
  </div>
</template>
