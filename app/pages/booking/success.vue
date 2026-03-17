<script setup lang="ts">
const route = useRoute();
const supabase = useSupabaseClient();
const sessionId = route.query.session_id as string;

const loading = ref(true);
const error = ref<string | null>(null);
const success = ref(false);

onMounted(async () => {
  if (!sessionId) {
    error.value = "ID de session manquant.";
    loading.value = false;
    return;
  }

  try {
    // Appel à la fonction Edge pour vérifier le paiement et créer la session
    const { data, error: functionError } = await supabase.functions.invoke(
      "verify_payment",
      {
        body: { sessionId },
      }
    );

    if (functionError) throw functionError;

    if (data?.success) {
      success.value = true;
    } else {
      throw new Error("La vérification du paiement a échoué.");
    }
  } catch (err: any) {
    console.error("Erreur de vérification:", err);
    error.value = err.message || "Une erreur est survenue lors de la validation de votre paiement.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-8">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="relative mx-auto h-24 w-24">
          <div class="absolute inset-0 animate-ping rounded-full bg-teal-500/20" />
          <div class="relative flex h-full w-full items-center justify-center">
            <UIcon name="i-heroicons-arrow-path" class="h-12 w-12 text-teal-500 animate-spin" />
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-black text-white uppercase tracking-tight">Validation du paiement</h1>
          <p class="text-slate-400 text-sm">Veuillez patienter pendant que nous confirmons votre réservation auprès de Stripe...</p>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="space-y-8 animate-fade-in">
        <div class="relative mx-auto h-24 w-24">
          <div class="absolute inset-0 animate-pulse rounded-full bg-teal-500/20 blur-xl" />
          <div class="relative flex h-full w-full items-center justify-center bg-teal-500 rounded-full shadow-lg shadow-teal-500/40">
            <UIcon name="i-heroicons-check" class="h-12 w-12 text-slate-950" />
          </div>
        </div>
        <div class="space-y-3">
          <h1 class="text-3xl font-black text-white uppercase tracking-tight">C'est validé !</h1>
          <p class="text-slate-400 leading-relaxed">
            Votre paiement a été confirmé. Votre coach a été notifié et vous recevrez bientôt les détails de votre session.
          </p>
        </div>
        <div class="pt-4 flex flex-col gap-3">
          <NuxtLink
            to="/dashboard/student"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-sm font-black text-slate-950 transition-all hover:bg-teal-400 active:scale-95"
          >
            VOIR MES SESSIONS
            <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
          </NuxtLink>
          <NuxtLink
            to="/"
            class="text-xs font-bold text-slate-500 hover:text-white transition-colors"
          >
            Retour à l'accueil
          </NuxtLink>
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="space-y-8">
        <div class="relative mx-auto h-24 w-24">
          <div class="absolute inset-0 bg-rose-500/10 rounded-full blur-xl" />
          <div class="relative flex h-full w-full items-center justify-center bg-rose-500/20 border border-rose-500/40 rounded-full">
            <UIcon name="i-heroicons-x-mark" class="h-12 w-12 text-rose-500" />
          </div>
        </div>
        <div class="space-y-3">
          <h1 class="text-2xl font-black text-white uppercase tracking-tight">Oups !</h1>
          <p class="text-rose-400/80 text-sm leading-relaxed">
            {{ error }}
          </p>
          <p class="text-slate-500 text-xs">
            Si vous avez été débité, ne vous inquiétez pas. Contactez notre support avec votre ID de session Stripe.
          </p>
        </div>
        <div class="pt-4">
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-8 py-4 text-sm font-black text-white ring-1 ring-white/10 transition-all hover:bg-white/10"
          >
            RETOUR À L'ACCUEIL
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
