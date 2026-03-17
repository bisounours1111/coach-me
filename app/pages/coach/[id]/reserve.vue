<script setup lang="ts">
import type { Availability } from "~/composables/useAvailability";
import { useAvailability } from "~/composables/useAvailability";
import { useSessions } from "~/composables/useSessions";
import { useCoachProfile } from "~/composables/useCoachProfile";

const route = useRoute();
const router = useRouter();
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return UUID_REGEX.test(raw) ? raw : null;
};

const coachId = normalizeUuid(route.params.id);

if (!coachId) {
  throw createError({
    statusCode: 400,
    statusMessage: "Identifiant coach invalide",
  });
}

const { getCoachPublicData } = useCoachProfile();
const { getCoachAvailabilities } = useAvailability();
const { createSessionRequest } = useSessions();

const { data: coach, pending: coachPending } = await useAsyncData(
  `coach-public-${coachId}`,
  () => getCoachPublicData(coachId),
);
const { data: availabilities, pending: availPending } = await useAsyncData(
  `availabilities-${coachId}`,
  () => getCoachAvailabilities(coachId),
);

const selectedSlot = ref<string | null>(null);
const studentNotes = ref("");
const selectedGame = ref("");
const submitting = ref(false);

interface GameOption {
  id: string;
  label: string;
  hourlyRate: number | null;
}

const games = computed<GameOption[]>(() => {
  if (!coach.value?.profile_game_roles) return [];
  return coach.value.profile_game_roles.map((role: any) => ({
    id: role.games.id,
    label: role.games.name,
    hourlyRate: role.hourly_rate,
  }));
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const getSlotStartAt = (slot: Availability) => slot.start_at;
const getSlotEndAt = (slot: Availability) => slot.end_at;

const sortedAvailabilities = computed(() =>
  (availabilities.value ?? [])
    .filter((slot) => {
      const startAt = getSlotStartAt(slot as Availability);
      return startAt ? new Date(startAt).getTime() >= Date.now() : false;
    })
    .sort((left, right) => {
      const leftStart = getSlotStartAt(left as Availability);
      const rightStart = getSlotStartAt(right as Availability);
      return new Date(leftStart ?? 0).getTime() - new Date(rightStart ?? 0).getTime();
    }),
);

const onSubmit = async () => {
  if (!selectedSlot.value || !selectedGame.value) return;

  submitting.value = true;
  try {
    const slot = sortedAvailabilities.value.find((item) => item.id === selectedSlot.value);
    if (!slot) return;

    const startAt = getSlotStartAt(slot as Availability);
    const endAt = getSlotEndAt(slot as Availability);
    if (!startAt || !endAt) {
      throw new Error("Créneau invalide");
    }

    const game = games.value.find((item) => item.id === selectedGame.value);
    const durationMinutes = Math.max(
      60,
      Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
    );

    await createSessionRequest({
      coach_id: coachId,
      start_at: startAt,
      end_at: endAt,
      duration_minutes: durationMinutes,
      price: Number(game?.hourlyRate ?? 20),
      currency: "EUR",
      student_notes: studentNotes.value,
      coach_notes: null,
      game: selectedGame.value,
    });

    router.push("/dashboard/student");
  } catch (error) {
    console.error(error);
    alert("Erreur lors de la réservation");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen py-12 px-4">
    <div class="max-w-3xl mx-auto">
      <UButton
        to="/"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-left"
        class="mb-8"
      >
        Retour au profil
      </UButton>

      <div v-if="coachPending || availPending" class="space-y-6">
        <USkeleton class="h-12 w-3/4" />
        <USkeleton class="h-64 w-full" />
      </div>

      <div v-else-if="coach" class="space-y-8">
        <header>
          <h1 class="text-3xl font-bold text-white mb-2">Réserver avec {{ coach.full_name }}</h1>
          <p class="text-gray-400">Choisissez un créneau et précisez vos besoins pour la session.</p>
        </header>

        <UCard class="bg-gray-900 border-gray-800">
          <form @submit.prevent="onSubmit" class="space-y-6">
            <UFormGroup label="Jeu concerné" required>
              <USelect
                v-model="selectedGame"
                :options="games"
                placeholder="Sélectionnez un jeu"
              />
            </UFormGroup>

            <UFormGroup label="Créneaux disponibles" required>
              <div
                v-if="sortedAvailabilities.length > 0"
                class="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <div
                  v-for="slot in sortedAvailabilities"
                  :key="slot.id"
                  class="relative"
                >
                  <input
                    type="radio"
                    :id="slot.id"
                    v-model="selectedSlot"
                    :value="slot.id"
                    class="peer sr-only"
                  />
                  <label
                    :for="slot.id"
                    class="flex flex-col p-4 bg-gray-800 border-2 border-transparent rounded-xl cursor-pointer hover:bg-gray-700 peer-checked:border-teal-500 peer-checked:bg-teal-500/10 transition-all"
                  >
                    <span class="font-bold capitalize text-white">
                      {{ formatDate(getSlotStartAt(slot) || "") }}
                    </span>
                    <span class="text-sm text-gray-400">
                      {{ formatTime(getSlotStartAt(slot) || "") }} -
                      {{ formatTime(getSlotEndAt(slot) || "") }}
                    </span>
                  </label>
                </div>
              </div>
              <p v-else class="text-yellow-500 text-sm italic">Ce coach n'a pas encore défini de disponibilités.</p>
            </UFormGroup>

            <UFormGroup label="Notes pour le coach (optionnel)">
              <UTextarea
                v-model="studentNotes"
                placeholder="Décrivez ce que vous souhaitez travailler durant cette session..."
                :rows="4"
              />
            </UFormGroup>

            <div class="pt-4">
              <UButton
                type="submit"
                block
                size="xl"
                color="primary"
                :loading="submitting"
                :disabled="!selectedSlot || !selectedGame"
              >
                Confirmer la demande de réservation
              </UButton>
              <p class="text-center text-xs text-gray-500 mt-4 italic">
                La réservation sera envoyée au coach pour validation. Le paiement sera demandé une fois le créneau accepté.
              </p>
            </div>
          </form>
        </UCard>
      </div>
    </div>
  </div>
</template>
