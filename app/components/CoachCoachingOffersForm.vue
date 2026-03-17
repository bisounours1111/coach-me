<template>
  <section class="space-y-6">
    <div class="space-y-4">
      <div class="flex flex-col gap-1">
        <h2
          class="text-sm font-semibold text-slate-100 italic flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-academic-cap"
            class="h-5 w-5 text-[#14b8a6]"
          />
          Jeux coachés
        </h2>
        <p class="text-xs text-slate-300/80">
          Sélectionne les jeux pour lesquels tu souhaites proposer du coaching.
        </p>
      </div>

      <div
        v-if="!selectedGames.length"
        class="rounded-xl border border-[#14b8a6]/20 bg-[#14b8a6]/5 p-6 text-center"
      >
        <p class="text-sm text-slate-300">
          Tu n'as sélectionné aucun jeu dans l'onglet "Mes Jeux".
        </p>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <button
          v-for="game in selectedGames"
          :key="`coach-toggle-${game.gameId}`"
          type="button"
          class="group relative flex flex-col items-center gap-3 rounded-2xl border p-3 transition-all duration-200"
          :class="[
            roleByGameId[game.gameId]?.isCoach
              ? 'border-[#14b8a6] bg-[#14b8a6]/5 ring-1 ring-[#14b8a6]/20'
              : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]',
          ]"
          @click="toggleCoach(game.gameId, !roleByGameId[game.gameId]?.isCoach)"
        >
          <div
            class="absolute top-2 right-2 h-5 w-5 rounded-full border flex items-center justify-center transition-colors"
            :class="[
              roleByGameId[game.gameId]?.isCoach
                ? 'bg-[#14b8a6] border-[#14b8a6] text-slate-950'
                : 'bg-black/20 border-white/10 text-transparent',
            ]"
          >
            <UIcon name="i-heroicons-check" class="h-3 w-3 font-bold" />
          </div>

          <div
            class="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg group-hover:scale-105 transition-transform"
          >
            <img
              v-if="getGameIcon(game.gameId)"
              :src="getGameIcon(game.gameId)!"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-slate-500"
            >
              <UIcon name="i-heroicons-puzzle-piece" class="h-6 w-6" />
            </div>
          </div>

          <span
            class="text-[0.7rem] font-medium text-center line-clamp-1"
            :class="
              roleByGameId[game.gameId]?.isCoach
                ? 'text-[#14b8a6]'
                : 'text-slate-300'
            "
          >
            {{ game.gameName }}
          </span>
          <span
            class="text-[9px] uppercase tracking-tighter text-slate-500 font-bold"
          >
            {{
              roleByGameId[game.gameId]?.isCoach ? "Coaching Actif" : "Inactif"
            }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="coachRoles.length > 0"
      class="pt-8 border-t border-white/5 space-y-6"
    >
      <div class="flex flex-col gap-1">
        <h2
          class="text-sm font-semibold text-slate-100 italic flex items-center gap-2"
        >
          <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-[#14b8a6]" />
          Détails des offres
        </h2>
        <p class="text-xs text-slate-300/80">
          Configure tes tarifs et descriptions pour chaque jeu.
        </p>
      </div>

      <div class="grid gap-6">
        <div
          v-for="role in coachRoles"
          :key="role.gameId"
          class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-5 backdrop-blur-md"
        >
          <div
            class="mb-4 flex items-center justify-between gap-2 border-b border-white/5 pb-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="h-8 w-8 overflow-hidden rounded-lg border border-white/10"
              >
                <img
                  v-if="getGameIcon(role.gameId)"
                  :src="getGameIcon(role.gameId)!"
                  class="h-full w-full object-cover"
                />
                <UIcon
                  v-else
                  name="i-heroicons-puzzle-piece"
                  class="h-5 w-5 m-1.5 text-slate-500"
                />
              </div>
              <p class="text-sm font-bold text-slate-50">{{ role.gameName }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl bg-[#14b8a6]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#14b8a6] transition hover:bg-[#14b8a6]/20"
              @click="addOffer(role.gameId)"
            >
              + Ajouter une offre
            </button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(offer, index) in role.offers"
              :key="offer.id ?? `${role.gameId}-${index}`"
              class="relative rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div class="mb-4 flex items-center justify-between gap-2">
                <span
                  class="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-white/10"
                >
                  OFFRE #{{ index + 1 }}
                </span>
                <button
                  v-if="role.offers.length > 1"
                  type="button"
                  class="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                  @click="removeOffer(role.gameId, index)"
                >
                  Supprimer
                </button>
              </div>

              <div class="grid gap-5">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div class="space-y-1.5 sm:col-span-1">
                    <label
                      class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >Tarif /h</label
                    >
                    <div class="relative">
                      <input
                        :value="offer.hourlyRate ?? ''"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 pl-4 pr-10 py-2.5 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                        @input="
                          updateOfferRate(
                            role.gameId,
                            index,
                            ($event.target as HTMLInputElement).value,
                          )
                        "
                      />
                      <span
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold"
                        >€</span
                      >
                    </div>
                  </div>

                  <div class="space-y-1.5 sm:col-span-3">
                    <label
                      class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >Description courte</label
                    >
                    <input
                      :value="offer.description"
                      type="text"
                      placeholder="Ex: Coaching individuel, analyse de replay..."
                      class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-2.5 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                      @input="
                        updateOfferDescription(
                          role.gameId,
                          index,
                          ($event.target as HTMLTextAreaElement).value,
                        )
                      "
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label
                    class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                    >Vidéos de présentation (URLs)</label
                  >
                  <textarea
                    :value="offer.videoUrls.join('\n')"
                    rows="2"
                    placeholder="https://youtube.com/watch?v=..."
                    class="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-2.5 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                    @input="
                      updateOfferVideos(
                        role.gameId,
                        index,
                        ($event.target as HTMLTextAreaElement).value,
                      )
                    "
                  />
                </div>

                <div
                  class="flex items-center justify-between pt-2 border-t border-white/5"
                >
                  <label
                    class="relative inline-flex items-center cursor-pointer group"
                  >
                    <input
                      :checked="offer.isActive"
                      type="checkbox"
                      class="sr-only peer"
                      @change="
                        updateOfferActive(
                          role.gameId,
                          index,
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    />
                    <div
                      class="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#14b8a6]/20 peer-checked:after:bg-[#14b8a6]"
                    ></div>
                    <span
                      class="ms-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors"
                    >
                      Offre active
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p
      v-if="errors?.offers"
      class="text-[0.7rem] text-rose-400 font-medium bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2"
    >
      {{ errors.offers }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type {
  CoachGameRole,
  CoachingOffer,
  ProfileFieldErrors,
  GameOption,
} from "../types/profile";

const props = withDefaults(
  defineProps<{
    modelValue: CoachGameRole[];
    games?: GameOption[];
    errors?: ProfileFieldErrors;
    userId?: string;
  }>(),
  { errors: () => ({}), userId: undefined, games: () => [] },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: CoachGameRole[]): void;
  (e: "validate"): void;
}>();

const client = useSupabaseClient();

const roleByGameId = computed<Record<string, CoachGameRole>>(() => {
  const map: Record<string, CoachGameRole> = {};
  if (!props.modelValue) return map;
  for (const role of props.modelValue) {
    if (role && role.gameId) {
      map[role.gameId] = role;
    }
  }
  return map;
});

const selectedGames = computed(() =>
  (props.modelValue || []).filter((role) => role && role.selected),
);

const coachRoles = computed(() =>
  (props.modelValue || []).filter(
    (role) => role && role.selected && role.isCoach,
  ),
);

const getGameIcon = (gameId: string) => {
  return props.games.find((g) => g.id === gameId)?.iconUrl;
};

const newOffer = (): CoachingOffer => ({
  hourlyRate: null,
  description: "",
  videoUrls: [],
  isActive: true,
});

const updateRole = (
  gameId: string,
  updater: (role: CoachGameRole) => CoachGameRole,
) => {
  const next = props.modelValue.map((role) =>
    role.gameId === gameId ? updater(role) : role,
  );
  emit("update:modelValue", next);
  emit("validate");
};

const toggleCoach = (gameId: string, isCoach: boolean) => {
  updateRole(gameId, (role) => ({
    ...role,
    isCoach,
    offers: isCoach ? (role.offers.length ? role.offers : [newOffer()]) : [],
  }));
};

const updateRoleOffers = (
  gameId: string,
  updater: (offers: CoachingOffer[]) => CoachingOffer[],
) => {
  updateRole(gameId, (role) => ({
    ...role,
    offers: updater(role.offers),
  }));
};

const addOffer = (gameId: string) => {
  updateRoleOffers(gameId, (offers) => [...offers, newOffer()]);
};

const removeOffer = (gameId: string, index: number) => {
  updateRoleOffers(gameId, (offers) =>
    offers.length <= 1 ? offers : offers.filter((_, i) => i !== index),
  );
};

const updateOfferRate = (gameId: string, index: number, value: string) => {
  updateRoleOffers(gameId, (offers) =>
    offers.map((offer, i) =>
      i === index
        ? {
            ...offer,
            hourlyRate: value.trim() ? Number(value) : null,
          }
        : offer,
    ),
  );
};

const updateOfferDescription = (
  gameId: string,
  index: number,
  value: string,
) => {
  updateRoleOffers(gameId, (offers) =>
    offers.map((offer, i) =>
      i === index ? { ...offer, description: value } : offer,
    ),
  );
};

const updateOfferVideos = (gameId: string, index: number, value: string) => {
  updateRoleOffers(gameId, (offers) =>
    offers.map((offer, i) =>
      i === index
        ? {
            ...offer,
            videoUrls: value
              .split("\n")
              .map((url) => url.trim())
              .filter(Boolean),
          }
        : offer,
    ),
  );
};

const updateOfferActive = (
  gameId: string,
  index: number,
  isActive: boolean,
) => {
  updateRoleOffers(gameId, (offers) =>
    offers.map((offer, i) => (i === index ? { ...offer, isActive } : offer)),
  );
};
</script>
