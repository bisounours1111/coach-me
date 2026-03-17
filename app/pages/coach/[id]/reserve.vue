<script setup lang="ts">
import { usePublicProfile } from "~/composables/usePublicProfile";

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { getPublicProfile } = usePublicProfile();

const coachId = route.params.id as string;
const offerId = typeof route.query.offerId === "string" ? route.query.offerId : "";
const gameName = typeof route.query.gameName === "string" ? route.query.gameName : "";
const hourlyRate = Number(typeof route.query.rate === "string" ? route.query.rate : 0);
const pageParamError = computed(() => {
  if (!offerId) return "Offre manquante (offerId). Reviens sur le profil du coach et relance la réservation.";
  if (!gameName) return "Jeu manquant (gameName). Reviens sur le profil du coach et relance la réservation.";
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return "Tarif invalide (rate). Reviens sur le profil du coach et relance la réservation.";
  return null;
});

const { data: profile, pending } = await useAsyncData(`reserve-profile-${coachId}`, () =>
  getPublicProfile(coachId)
);

// State pour la sélection en deux étapes
const selectedDate = ref<string | null>(null);
const selectedSlotId = ref<string | null>(null);
const loading = ref(false);

// Groupement des créneaux par date
const availabilitiesByDate = computed(() => {
  if (!profile.value?.availabilities) return new Map();
  
  const groups = new Map<string, any[]>();
  
  profile.value.availabilities.forEach(slot => {
    const dateKey = new Date(slot.startAt).toISOString().split("T")[0] ?? "";
    if (!dateKey) return;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)?.push(slot);
  });
  
  // Trier les dates
  return new Map([...groups.entries()].sort());
});

const availableDates = computed(() => Array.from(availabilitiesByDate.value.keys()));

const slotsForSelectedDate = computed(() => {
  if (!selectedDate.value) return [];
  return availabilitiesByDate.value.get(selectedDate.value) || [];
});

type AvailabilitySlot = { id: string; startAt: string };

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handlePayment = async () => {
  if (!user.value) return navigateTo("/auth/login");
  if (!selectedSlotId.value) return;
  if (pageParamError.value) {
    alert(pageParamError.value);
    return;
  }

  loading.value = true;
  try {
    const { data, error } = await supabase.functions.invoke(
      "create_checkout_session",
      {
        body: {
          coachId,
          offerId,
          gameName,
          hourlyRate,
          studentId: user.value.id,
          slotId: selectedSlotId.value,
        },
      },
    );

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Erreur Stripe:", err);
    alert("Impossible de lancer le paiement. Veuillez réessayer.");
  } finally {
    loading.value = false;
  }
};

// Reset slot if date changes
watch(selectedDate, () => {
  selectedSlotId.value = null;
});
</script>

<template>
  <div class="min-h-screen bg-[#050812] py-12 px-4">
    <div class="max-w-2xl mx-auto space-y-10">
      <!-- Header -->
      <header class="space-y-4">
        <NuxtLink
          :to="`/profile/${coachId}`"
          class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-400 transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Retour au profil
        </NuxtLink>
        
        <div v-if="profile" class="flex items-center gap-4">
          <UAvatar
            :src="profile.avatarUrl || ''"
            :alt="profile.fullName"
            size="lg"
            class="ring-2 ring-white/10"
          />
          <div>
            <h1 class="text-2xl font-black text-white">Réserver une session</h1>
            <p class="text-slate-400 text-sm">
              Coaching <span class="text-teal-400 font-bold">{{ gameName }}</span> avec {{ profile.fullName }}
            </p>
          </div>
        </div>
      </header>

      <div v-if="pending" class="space-y-6">
        <USkeleton class="h-40 w-full rounded-3xl" />
        <USkeleton class="h-40 w-full rounded-3xl" />
      </div>

      <div v-else-if="profile" class="space-y-8">
        <!-- Étape 1 : Choisir le jour -->
        <section class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-slate-950 font-black text-sm">1</div>
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Choisir une date</h2>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="date in availableDates"
              :key="date"
              @click="selectedDate = date"
              class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center"
              :class="[
                selectedDate === date
                  ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
              ]"
            >
              <span class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                {{ new Date(date).toLocaleDateString('fr-FR', { month: 'short' }) }}
              </span>
              <span class="text-xl font-black">{{ new Date(date).getDate() }}</span>
              <span class="text-[10px] font-bold capitalize">{{ new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }) }}</span>
            </button>
          </div>
        </section>

        <!-- Étape 2 : Choisir l'heure -->
        <section v-if="selectedDate" class="space-y-4 animate-fade-in">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-slate-950 font-black text-sm">2</div>
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Choisir un horaire</h2>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              v-for="slot in slotsForSelectedDate"
              :key="slot.id"
              @click="selectedSlotId = slot.id"
              class="p-3 rounded-xl border-2 transition-all text-center font-bold text-sm"
              :class="[
                selectedSlotId === slot.id
                  ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
              ]"
            >
              {{ formatTime(slot.startAt) }}
            </button>
          </div>
        </section>

        <!-- Footer Action -->
        <footer v-if="selectedSlotId" class="pt-10 border-t border-white/5 animate-fade-in">
          <div class="bg-teal-500/5 border border-teal-500/20 rounded-3xl p-6 mb-6 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/80 mb-1">Récapitulatif</p>
              <p class="text-white font-bold">
                {{ formatDate(selectedDate!) }} à {{ formatTime((slotsForSelectedDate as AvailabilitySlot[]).find((s) => s.id === selectedSlotId)?.startAt!) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/80 mb-1">Total</p>
              <p class="text-2xl font-black text-white">{{ hourlyRate }}€</p>
            </div>
          </div>

          <button
            @click="handlePayment"
            :disabled="loading"
            class="w-full py-5 rounded-2xl bg-teal-500 text-slate-950 font-black tracking-widest uppercase text-sm shadow-xl shadow-teal-500/20 hover:bg-teal-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <span v-if="!loading">Confirmer et Payer</span>
            <span v-else>Traitement en cours...</span>
            <UIcon v-if="!loading" name="i-heroicons-credit-card" class="h-5 w-5" />
            <UIcon v-else name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
          </button>
          <p class="text-center text-[10px] text-slate-500 mt-4">
            Paiement sécurisé via Stripe. Le coach sera notifié immédiatement après validation.
          </p>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(20, 184, 166, 0.3);
  border-radius: 10px;
}
</style>
