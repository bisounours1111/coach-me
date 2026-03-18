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
  const done = all.filter((s) => s.status === "done").length;
  // Revenus : uniquement sessions payées/confirmées/terminées (jamais canceled/remboursées)
  const paidLike = all.filter(
    (s) => s.status !== "canceled" && ["paid", "upcoming", "done"].includes(s.status),
  );
  const grossRevenue = paidLike.reduce((sum, s) => sum + Number(s.price ?? 0), 0);
  const netRevenue = grossRevenue * (1 - PLATFORM_FEE_RATE);

  return {
    done,
    total: all.filter((s) => s.status !== "canceled").length,
    grossRevenue,
    netRevenue,
  };
});

const transactions = computed(() => {
  return sessions.value
    .filter((s) => ["paid", "done", "canceled"].includes(s.status))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
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
    try {
      await supabase.auth.refreshSession();
    } catch {
      /* ignore refresh errors */
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (accessToken) {
      const { data, error: fnError } = await supabase.functions.invoke<any>(
        "get_wallet_balance",
        {
          body: {},
          headers: { Authorization: `Bearer ${accessToken}` },
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
    const msg = e?.message || "";
    error.value =
      msg.includes("401") || msg.includes("JWT") || msg.includes("Invalid")
        ? "Session expirée. Déconnectez-vous puis reconnectez-vous."
        : msg || "Impossible de charger vos sessions.";
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
    <div class="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3">
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
          Total sessions
        </p>
        <p class="mt-2 text-3xl font-black text-indigo-300">
          {{ loading ? "…" : stats.total }}
        </p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p
          class="text-[10px] font-black uppercase tracking-wider text-slate-500"
        >
          Solde à payer
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
                : "Consultez votre planning de réservations."
          }}
        </p>
        <NuxtLink
          to="/dashboard/coach/sessions"
          class="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-indigo-400 transition hover:text-indigo-300"
        >
          Voir mes sessions
          <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10"
        >
          <UIcon
            name="i-heroicons-banknotes"
            class="h-6 w-6 text-teal-400"
          />
        </div>
        <h3 class="text-base font-black text-white">Mes transactions</h3>
        <p class="mt-1 text-sm text-slate-500">
          Historique des paiements et annulations.
        </p>
        
        <div v-if="!loading && transactions.length > 0" class="mt-5 space-y-3">
          <div
            v-for="t in transactions.slice(0, 5)"
            :key="t.id"
            class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-black text-white">
                {{ t.game || "Coaching" }}
              </p>
              <p class="mt-0.5 text-[10px] text-slate-500">
                {{ formatDateTime(t.created_at) }}
              </p>
            </div>
            <div class="text-right">
              <p 
                class="text-sm font-black"
                :class="t.status === 'canceled' ? 'text-rose-500 line-through' : 'text-teal-400'"
              >
                {{ Number(t.price).toFixed(0) }}€
              </p>
              <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                {{ t.status === 'canceled' ? 'Annulé' : 'Payé' }}
              </p>
            </div>
          </div>
        </div>
        <p v-else-if="!loading" class="mt-5 text-xs italic text-slate-600">
          Aucune transaction récente.
        </p>
      </div>
    </div>
  </div>
</template>
