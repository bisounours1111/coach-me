<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "student",
});

useHead({
  title: "Dashboard élève · CoachMe",
});

const user = useSupabaseUser();
const supabase = useSupabaseClient<any>();
const { getSessions } = useSessions();
const { getCoachProfile } = useCoachProfile();

const loading = ref(true);
const error = ref<string | null>(null);
const sessions = ref<any[]>([]);
const profileName = ref<string | null>(null);

const displayName = computed(() => {
  if (profileName.value) return profileName.value;
  if (!user.value) return "Joueur";

  // Priorité au full_name dans les metadata de l'utilisateur si présent
  const metaName =
    user.value.user_metadata?.full_name || user.value.user_metadata?.name;
  if (metaName) return metaName;

  const email = user.value.email ?? "";
  return email.split("@")[0] || "Joueur";
});

const stats = computed(() => {
  const all = sessions.value;
  const upcoming = all.filter((s) => s.status === "upcoming").length;
  const pending = all.filter((s) => s.status === "pending").length;
  const done = all.filter((s) => s.status === "done").length;
  return {
    upcoming,
    pending,
    done,
    total: all.length,
  };
});

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    if (user.value?.sub) {
      const profile = await getCoachProfile(user.value.sub);
      profileName.value = profile.fullName || null;
    }
    sessions.value = await getSessions("student");
  } catch (e: any) {
    console.error(e);
    error.value =
      e?.message || "Impossible de charger vos sessions pour le moment.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header class="mb-10">
      <p
        class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80"
      >
        Espace élève
      </p>
      <h1 class="mt-2 text-3xl font-black text-white md:text-4xl">
        Bienvenue, <span class="text-teal-400">{{ displayName }}</span>
      </h1>
      <p class="mt-2 text-sm text-slate-400">
        Gère tes sessions de coaching et suis ta progression.
      </p>
    </header>

    <!-- Stats -->
    <div class="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          À venir
        </p>
        <p class="mt-2 text-3xl font-black text-teal-400">
          {{ loading ? "…" : stats.upcoming }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          En attente
        </p>
        <p class="mt-2 text-3xl font-black text-amber-400">
          {{ loading ? "…" : stats.pending }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Terminées
        </p>
        <p class="mt-2 text-3xl font-black text-slate-400">
          {{ loading ? "…" : stats.done }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Total
        </p>
        <p class="mt-2 text-3xl font-black text-indigo-400">
          {{ loading ? "…" : stats.total }}
        </p>
      </div>
    </div>

    <div
      v-if="error"
      class="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6"
    >
      <p class="text-sm font-bold text-rose-300">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="grid gap-4">
      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
        <div class="flex items-center gap-3 text-slate-400">
          <UIcon name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
          Chargement de vos sessions…
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="sessions.length === 0"
      class="rounded-3xl border border-white/5 bg-white/[0.02] p-16 text-center"
    >
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10"
      >
        <UIcon name="i-heroicons-calendar-days" class="h-8 w-8 text-teal-400" />
      </div>
      <h2 class="text-xl font-black text-white">
        Aucune session pour l'instant
      </h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Trouve un coach et réserve ta première session pour commencer à
        progresser.
      </p>
      <NuxtLink
        to="/games"
        class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
      >
        Trouver un coach
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>

    <!-- List -->
    <div v-else class="grid gap-4">
      <div
        v-for="s in sessions"
        :key="s.id"
        class="rounded-3xl border border-white/5 bg-white/[0.02] p-6"
      >
        <div class="flex items-start justify-between gap-6">
          <div class="space-y-1">
            <p
              class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500"
            >
              Session
            </p>
            <p class="text-lg font-black text-white">
              {{ s.game || "Coaching" }}
            </p>
            <p class="text-sm text-teal-400/90">
              Coach : {{ s.coach_name ?? "—" }}
            </p>
            <p class="text-sm text-slate-400">
              {{ formatDateTime(s.start_at) }}
              <span v-if="s.end_at">→ {{ formatDateTime(s.end_at) }}</span>
            </p>
          </div>

          <div class="text-right">
            <p
              class="text-xs font-black uppercase tracking-widest text-slate-500"
            >
              Statut
            </p>
            <p class="mt-1 text-sm font-black text-teal-300">
              {{ s.status }}
            </p>
            <p class="mt-2 text-lg font-black text-white">
              {{ Number(s.price).toFixed(0) }}€
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
