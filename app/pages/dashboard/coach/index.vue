<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "coach",
});

useHead({
  title: "Dashboard coach · CoachMe",
});

const user = useSupabaseUser();
const supabase = useSupabaseClient<any>();
const { getSessions } = useSessions();
const { getCoachProfile } = useCoachProfile();

const loading = ref(true);
const error = ref<string | null>(null);
const sessions = ref<any[]>([]);
const profileName = ref<string | null>(null);

type WalletBalance = {
  availableCents: number;
  earnedCents: number;
  withdrawnCents: number;
  pendingPayoutCents: number;
  currency: string;
};

const walletLoading = ref(true);
const walletError = ref<string | null>(null);
const walletBalance = ref<WalletBalance | null>(null);

const displayName = computed(() => {
  if (profileName.value) return profileName.value;
  if (!user.value) return "Coach";

  // Priorité au full_name dans les metadata de l'utilisateur si présent
  console.log("[displayName] User metadata:", user.value.user_metadata);
  console.log("[displayName] Full name:", user.value);
  const metaName =
    user.value.user_metadata?.full_name || user.value.user_metadata?.name;
  if (metaName) return metaName;

  const email = user.value.email ?? "";
  return email.split("@")[0] || "Coach";
});

const eur = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Commission plateforme estimée (à ajuster selon ton modèle économique)
const PLATFORM_FEE_RATE = 0.15; // 15%

const stats = computed(() => {
  const all = sessions.value;
  const now = Date.now();
  const upcoming = all.filter((s) => {
    const start = Date.parse(String(s.start_at));
    if (!Number.isFinite(start)) return false;
    // On considère "à venir" si la session est payée/planifiée et dans le futur
    return start >= now && ["paid", "upcoming"].includes(String(s.status));
  }).length;
  const done = all.filter((s) => s.status === "done").length;
  const paidLike = all.filter((s) =>
    ["paid", "upcoming", "done"].includes(s.status),
  );
  const grossRevenue = paidLike.reduce(
    (sum, s) => sum + Number(s.price ?? 0),
    0,
  );
  const netRevenue = grossRevenue * (1 - PLATFORM_FEE_RATE);

  return {
    upcoming,
    done,
    total: all.length,
    grossRevenue,
    netRevenue,
  };
});

const formatMoney = (amount: number) =>
  amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

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
    sessions.value = await getSessions("coach");

    walletLoading.value = true;
    walletError.value = null;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      const { data, error: fnError } = await supabase.functions.invoke<any>(
        "get_wallet_balance",
        {
          body: {},
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      if (fnError) throw fnError;
      walletBalance.value = data ?? null;
    } else {
      walletBalance.value = null;
      walletError.value = "Session absente: veuillez vous reconnecter.";
    }
  } catch (e: any) {
    console.error(e);
    error.value = e?.message || "Impossible de charger vos sessions.";
  } finally {
    loading.value = false;
    walletLoading.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header
      class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p
          class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80"
        >
          Espace coach
        </p>
        <h1 class="mt-2 text-3xl font-black text-white md:text-4xl">
          Bienvenue, <span class="text-teal-400">{{ displayName }}</span>
        </h1>
        <p class="mt-2 text-sm text-slate-400">
          Gère tes sessions et ton profil de coaching.
        </p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <NuxtLink
          to="/dashboard/coach/wallet"
          class="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 active:scale-95"
        >
          <UIcon name="i-heroicons-wallet" class="h-4 w-4" />
          Portefeuille
        </NuxtLink>
        <NuxtLink
          to="/profile/edit"
          class="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 active:scale-95"
        >
          <UIcon name="i-heroicons-pencil-square" class="h-4 w-4" />
          Modifier mon profil
        </NuxtLink>
      </div>
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
        <p class="mt-2 text-3xl font-black text-indigo-300">
          {{ loading ? "…" : stats.total }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          À payer
        </p>
        <p class="mt-2 text-3xl font-black text-indigo-400">
          {{ walletLoading ? "…" : eur(walletBalance?.availableCents ?? 0) }}
        </p>
        <p v-if="walletError" class="mt-1 text-[10px] font-bold text-amber-300">
          {{ walletError }}
        </p>
      </div>
    </div>

    <div class="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Revenus total
        </p>
        <p class="mt-2 text-2xl font-black text-white">
          {{ walletLoading ? "…" : eur(walletBalance?.earnedCents ?? 0) }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Déjà retiré
        </p>
        <p class="mt-2 text-2xl font-black text-white">
          {{ walletLoading ? "…" : eur(walletBalance?.withdrawnCents ?? 0) }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Retrait en attente
        </p>
        <p class="mt-2 text-2xl font-black text-white">
          {{
            walletLoading ? "…" : eur(walletBalance?.pendingPayoutCents ?? 0)
          }}
        </p>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-10 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6"
    >
      <p class="text-sm font-bold text-rose-300">{{ error }}</p>
    </div>

    <!-- Quick actions -->
    <div class="mb-10 grid gap-4 md:grid-cols-2">
      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10"
        >
          <UIcon name="i-heroicons-user-circle" class="h-6 w-6 text-teal-400" />
        </div>
        <h3 class="text-base font-black text-white">Mon profil public</h3>
        <p class="mt-1 text-sm text-slate-500">
          Configure tes offres, tes jeux et ta bio pour attirer plus d'élèves.
        </p>
        <NuxtLink
          to="/profile/edit"
          class="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-teal-400 transition hover:text-teal-300"
        >
          Modifier mon profil
          <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10"
        >
          <UIcon
            name="i-heroicons-calendar-days"
            class="h-6 w-6 text-indigo-400"
          />
        </div>
        <h3 class="text-base font-black text-white">Mes sessions</h3>
        <p class="mt-1 text-sm text-slate-500">
          {{
            loading
              ? "Chargement…"
              : sessions.length === 0
                ? "Aucune session pour l'instant."
                : "Voici tes dernières sessions."
          }}
        </p>
        <div v-if="!loading && sessions.length > 0" class="mt-5 space-y-3">
          <div
            v-for="s in sessions.slice(0, 5)"
            :key="s.id"
            class="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-black text-white">
                  {{ s.game || "Coaching" }}
                </p>
                <p class="mt-1 text-xs text-slate-400">
                  {{ formatDateTime(s.start_at) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs font-black text-teal-300">{{ s.status }}</p>
                <p class="mt-1 text-sm font-black text-white">
                  {{ Number(s.price).toFixed(0) }}€
                </p>
              </div>
            </div>
          </div>
          <p class="text-[10px] font-bold text-slate-500">
            Recettes estimées: {{ formatMoney(stats.grossRevenue) }} brut →
            {{ formatMoney(stats.netRevenue) }} net (commission
            {{ Math.round(PLATFORM_FEE_RATE * 100) }}%).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
