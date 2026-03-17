<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "coach",
});

useHead({
  title: "Portefeuille · CoachMe",
});

const supabase = useSupabaseClient<any>();
const user = useSupabaseUser();

const loading = ref(false);
const error = ref<string | null>(null);

const balanceLoading = ref(true);
const balanceError = ref<string | null>(null);

type WalletBalance = {
  availableCents: number;
  earnedCents: number;
  withdrawnCents: number;
  pendingPayoutCents: number;
  currency: string;
};

const walletBalance = ref<WalletBalance | null>(null);

const sessionStatus = ref<"unknown" | "ok" | "missing">("unknown");
const lastTokenInfo = ref<null | {
  hasToken: boolean;
  iss?: string;
  aud?: string;
  exp?: number;
}>(null);

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = atob(parts[1] ?? "");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

const invokeAuthed = async <T,>(
  name: string,
  body: any,
): Promise<{ data: T | null; error: any }> => {
  // Tente un refresh silencieux (utile si token expiré)
  try {
    await supabase.auth.refreshSession();
  } catch {
    // noop
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    sessionStatus.value = "missing";
    lastTokenInfo.value = { hasToken: false };
    return {
      data: null,
      error: new Error("Session absente: veuillez vous reconnecter."),
    };
  }

  const payload = decodeJwtPayload(accessToken);
  lastTokenInfo.value = {
    hasToken: true,
    iss: typeof payload?.iss === "string" ? payload.iss : undefined,
    aud: typeof payload?.aud === "string" ? payload.aud : undefined,
    exp: typeof payload?.exp === "number" ? payload.exp : undefined,
  };

  sessionStatus.value = "ok";
  return await supabase.functions.invoke<T>(name, {
    body,
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
};

const eur = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const availableEurCents = computed(() => walletBalance.value?.availableCents ?? 0);

const fetchBalance = async () => {
  balanceLoading.value = true;
  balanceError.value = null;
  try {
    const { data, error } = await invokeAuthed<any>("get_wallet_balance", {});
    if (error) throw error;
    walletBalance.value = data ?? null;
  } catch (e: any) {
    console.error(e);
    walletBalance.value = null;
    balanceError.value =
      e?.message || "Impossible de récupérer le solde Stripe.";
  } finally {
    balanceLoading.value = false;
  }
};

const startOnboarding = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fnError } = await invokeAuthed<any>(
      "create_connect_account",
      {},
    );
    if (fnError) throw fnError;
    const url = data?.url;
    if (!url) throw new Error("URL d'onboarding manquante");
    window.location.href = url;
  } catch (e: any) {
    console.error(e);
    error.value = e?.message || "Impossible de démarrer l'onboarding Stripe.";
  } finally {
    loading.value = false;
  }
};

const payout = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { error: fnError } = await invokeAuthed<any>("request_payout", {});
    if (fnError) throw fnError;
    await fetchBalance();
  } catch (e: any) {
    console.error(e);
    error.value = e?.message || "Impossible de déclencher le virement.";
  } finally {
    loading.value = false;
  }
};

watchEffect(() => {
  if (!user.value) {
    balanceLoading.value = false;
    walletBalance.value = null;
    balanceError.value = "Non connecté.";
    return;
  }
  if (!balanceLoading.value && walletBalance.value) return;
});

onMounted(async () => {
  if (user.value) {
    await fetchBalance();
  } else {
    sessionStatus.value = "missing";
    balanceLoading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#050812]">
    <div class="mx-auto max-w-4xl px-4 py-12">
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
            Portefeuille
          </h1>
          <p class="mt-2 text-sm text-slate-400">
            Consulte ton solde Stripe et retire tes fonds.
          </p>
        </div>
        <NuxtLink
          to="/dashboard/coach"
          class="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 active:scale-95"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Retour dashboard
        </NuxtLink>
      </header>

      <div
        v-if="!user"
        class="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
      >
        Vous devez être connecté pour accéder au portefeuille.
      </div>

      <div
        v-else-if="sessionStatus === 'missing'"
        class="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"
      >
        Session invalide/expirée. Déconnectez-vous puis reconnectez-vous.
      </div>

      <details
        class="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200"
      >
        <summary class="cursor-pointer select-none font-black text-slate-100">
          Debug auth (local)
        </summary>
        <div class="mt-3 space-y-2 text-slate-300">
          <div>
            <span class="font-black text-slate-100">user</span> :
            {{ user?.sub ?? "null" }}
          </div>
          <div>
            <span class="font-black text-slate-100">sessionStatus</span> :
            {{ sessionStatus }}
          </div>
          <div>
            <span class="font-black text-slate-100">hasToken</span> :
            {{ lastTokenInfo?.hasToken ?? "unknown" }}
          </div>
          <div>
            <span class="font-black text-slate-100">iss</span> :
            {{ lastTokenInfo?.iss ?? "—" }}
          </div>
          <div>
            <span class="font-black text-slate-100">aud</span> :
            {{ lastTokenInfo?.aud ?? "—" }}
          </div>
          <div>
            <span class="font-black text-slate-100">exp</span> :
            {{
              typeof lastTokenInfo?.exp === "number"
                ? new Date(lastTokenInfo.exp * 1000).toLocaleString("fr-FR")
                : "—"
            }}
          </div>
        </div>
      </details>

      <div
        v-if="error"
        class="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
      >
        {{ error }}
      </div>
      <div
        v-if="balanceError"
        class="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"
      >
        {{ balanceError }}
      </div>

      <section class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p
            class="text-[10px] font-black uppercase tracking-wider text-slate-500"
          >
            Disponible
          </p>
          <p class="mt-2 text-4xl font-black text-teal-400">
            {{ balanceLoading ? "…" : eur(availableEurCents) }}
          </p>
          <p class="mt-2 text-xs text-slate-400">
            Montant retirable immédiatement (cagnotte interne).
          </p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p
            class="text-[10px] font-black uppercase tracking-wider text-slate-500"
          >
            Retrait en attente
          </p>
          <p class="mt-2 text-4xl font-black text-slate-200">
            {{
              balanceLoading
                ? "…"
                : eur(walletBalance?.pendingPayoutCents ?? 0)
            }}
          </p>
          <p class="mt-2 text-xs text-slate-400">
            Montant demandé en cash-out mais pas encore confirmé.
          </p>
        </div>
      </section>

      <section class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Revenus total
          </p>
          <p class="mt-2 text-3xl font-black text-white">
            {{ balanceLoading ? "…" : eur(walletBalance?.earnedCents ?? 0) }}
          </p>
          <p class="mt-2 text-xs text-slate-400">
            Total gagné (crédits validés).
          </p>
        </div>

        <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Déjà retiré
          </p>
          <p class="mt-2 text-3xl font-black text-white">
            {{ balanceLoading ? "…" : eur(walletBalance?.withdrawnCents ?? 0) }}
          </p>
          <p class="mt-2 text-xs text-slate-400">
            Total des retraits confirmés.
          </p>
        </div>
      </section>

      <section class="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-xs font-black text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading || balanceLoading"
          @click="payout"
        >
          <UIcon name="i-heroicons-banknotes" class="h-4 w-4" />
          Retirer mes fonds
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
          @click="startOnboarding"
        >
          <UIcon name="i-heroicons-identification" class="h-4 w-4" />
          Configurer Stripe Connect
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading || balanceLoading"
          @click="fetchBalance"
        >
          <UIcon name="i-heroicons-arrow-path" class="h-4 w-4" />
          Rafraîchir
        </button>
      </section>
    </div>
  </div>
</template>
