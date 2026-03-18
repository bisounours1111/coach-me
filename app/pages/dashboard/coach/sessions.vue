<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "coach",
});

useHead({
  title: "Mes sessions · CoachMe",
});

const { getSessions, invokeSessionAction } = useSessions();
const { openWithCoach } = useMessagingPanel();

const loading = ref(true);
const processingId = ref<string | null>(null);
const sessions = ref<any[]>([]);
const activeTab = ref<"upcoming" | "booked" | "completed">("upcoming");

const getSlotStatus = (s: any) =>
  (s?.coach_availabilities?.status as string | undefined) ?? null;

const isPast = (s: any) => {
  const endAt = s?.coach_availabilities?.end_at || s?.end_at;
  if (!endAt) return false;
  return Date.parse(endAt) < Date.now();
};

const pendingSessions = computed(() => {
  return sessions.value
    .filter((s: any) => getSlotStatus(s) === "upcoming" || getSlotStatus(s) === "pending")
    .sort(
      (a: any, b: any) =>
        Date.parse(a.coach_availabilities?.start_at || a.start_at) -
        Date.parse(b.coach_availabilities?.start_at || b.start_at),
    );
});

const bookedSessions = computed(() => {
  return sessions.value
    .filter((s: any) => getSlotStatus(s) === "booked")
    .sort(
      (a: any, b: any) =>
        Date.parse(a.coach_availabilities?.start_at || a.start_at) -
        Date.parse(b.coach_availabilities?.start_at || b.start_at),
    );
});

const completedSessions = computed(() => {
  return sessions.value
    .filter((s: any) => getSlotStatus(s) === "confirmed" || s.status === "done")
    .sort(
      (a: any, b: any) =>
        Date.parse(b.coach_availabilities?.start_at || b.start_at) -
        Date.parse(a.coach_availabilities?.start_at || a.start_at),
    );
});

const currentSessions = computed(() => {
  if (activeTab.value === "upcoming") return pendingSessions.value;
  if (activeTab.value === "booked") return bookedSessions.value;
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

const contactStudent = (studentId: string) => {
  openWithCoach(studentId);
};

const handleAction = async (
  sessionId: string,
  action: "confirm" | "cancel" | "validate",
) => {
  if (processingId.value) return;

  const confirmMsg =
    action === "confirm"
      ? "Voulez-vous confirmer cette réservation ? Le créneau passera en 'bloqué'."
      : action === "validate"
        ? "Voulez-vous valider ce créneau ? (sera marqué terminé)"
        : "Voulez-vous annuler cette réservation ? L'élève sera remboursé.";

  if (!confirm(confirmMsg)) return;

  processingId.value = sessionId;
  try {
    await invokeSessionAction(sessionId, action);
    // Rafraîchir la liste
    const all = await getSessions("coach");
    sessions.value = all.filter((s: any) => s.status !== "canceled");
  } catch (e: any) {
    alert("Erreur : " + (e.message || "Impossible d'effectuer l'action"));
  } finally {
    processingId.value = null;
  }
};

onMounted(async () => {
  try {
    const all = await getSessions("coach");
    // On ne garde que les sessions qui ne sont pas annulées
    sessions.value = all.filter((s: any) => s.status !== "canceled");

    // Définir l'onglet actif par défaut sur le premier qui contient des données
    if (pendingSessions.value.length > 0) {
      activeTab.value = "upcoming";
    } else if (bookedSessions.value.length > 0) {
      activeTab.value = "booked";
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
          :disabled="pendingSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'upcoming' 
            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-clock" class="h-4 w-4" />
          EN ATTENTE
          <span class="ml-1 opacity-60">({{ pendingSessions.length }})</span>
        </button>

        <button
          @click="activeTab = 'booked'"
          :disabled="bookedSessions.length === 0"
          class="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          :class="activeTab === 'booked' 
            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20' 
            : 'bg-white/5 text-slate-400 hover:bg-white/10'"
        >
          <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
          CONFIRMÉES
          <span class="ml-1 opacity-60">({{ bookedSessions.length }})</span>
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
          TERMINÉES
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
                :class="activeTab === 'completed' ? 'bg-white/5 text-slate-500' : (activeTab === 'upcoming' ? 'bg-amber-500/10 text-amber-400' : 'bg-teal-500/10 text-teal-400')"
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
              <div v-if="activeTab === 'upcoming'" class="flex items-center gap-2">
                <button
                  @click="handleAction(s.id, 'confirm')"
                  :disabled="!!processingId"
                  class="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-teal-400 disabled:opacity-50"
                >
                  <UIcon name="i-heroicons-check" class="h-4 w-4" />
                  ACCEPTER
                </button>
                <button
                  @click="handleAction(s.id, 'cancel')"
                  :disabled="!!processingId"
                  class="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-black text-slate-400 transition hover:bg-rose-500 hover:text-white disabled:opacity-50"
                >
                  <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                  REFUSER
                </button>
              </div>

              <div v-else-if="activeTab === 'booked'" class="flex items-center gap-2">
                <button
                  v-if="isPast(s)"
                  @click="handleAction(s.id, 'validate')"
                  :disabled="!!processingId"
                  class="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  <UIcon name="i-heroicons-check-badge" class="h-4 w-4" />
                  VALIDER
                </button>
              </div>

              <div class="text-right sm:mx-6">
                <p
                  v-if="getSlotStatus(s) === 'upcoming' || getSlotStatus(s) === 'pending'"
                  class="text-[10px] font-black uppercase tracking-widest text-amber-500"
                >
                  EN ATTENTE
                </p>
                <p
                  v-else-if="getSlotStatus(s) === 'booked'"
                  class="text-[10px] font-black uppercase tracking-widest text-teal-500"
                >
                  CONFIRMÉ
                </p>
                <p
                  v-else-if="getSlotStatus(s) === 'confirmed'"
                  class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                >
                  TERMINÉ
                </p>
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
