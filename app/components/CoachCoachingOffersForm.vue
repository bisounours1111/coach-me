<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-sm font-semibold text-slate-100">Offres de coaching</h2>
      <p class="mt-1 text-xs text-slate-300/80">
        Configure une ou plusieurs offres par jeu ou tu coaches.
      </p>
    </div>

    <div
      v-if="!coachRoles.length"
      class="rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-xs text-slate-200/80"
    >
      Active au moins un jeu en mode coach pour configurer tes offres.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="role in coachRoles"
        :key="role.gameId"
        class="rounded-xl border border-white/10 bg-[#0b0f19]/45 p-4 backdrop-blur"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="text-xs font-medium text-slate-100">{{ role.gameName }}</p>
          <button
            type="button"
            class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-200/80 transition hover:bg-white/10"
            @click="addOffer(role.gameId)"
          >
            Ajouter une offre
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(offer, index) in role.offers"
            :key="offer.id ?? `${role.gameId}-${index}`"
            class="rounded-xl border border-white/10 bg-[#050812]/55 p-3"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-[0.7rem] text-slate-200/80">
                Offre {{ index + 1 }}
              </p>
              <button
                type="button"
                class="text-[0.7rem] text-rose-200/85 transition hover:text-rose-100"
                :disabled="role.offers.length <= 1"
                @click="removeOffer(role.gameId, index)"
              >
                Supprimer
              </button>
            </div>

            <div class="grid gap-3">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-200/90"
                  >Tarif horaire (EUR)</label
                >
                <input
                  :value="offer.hourlyRate ?? ''"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                  @input="
                    updateOfferRate(
                      role.gameId,
                      index,
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-200/90"
                  >Description</label
                >
                <textarea
                  :value="offer.description"
                  rows="3"
                  class="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                  @input="
                    updateOfferDescription(
                      role.gameId,
                      index,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-200/90"
                  >URLs video (une URL par ligne)</label
                >
                <textarea
                  :value="offer.videoUrls.join('\n')"
                  rows="3"
                  class="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-[#14b8a6]/50"
                  @input="
                    updateOfferVideos(
                      role.gameId,
                      index,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                />
                <div class="flex items-center gap-2">
                  <label
                    class="inline-flex cursor-pointer items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-200/85 transition hover:bg-white/10"
                    :class="!userId ? 'cursor-not-allowed opacity-50' : ''"
                  >
                    <input
                      type="file"
                      accept="video/*"
                      class="hidden"
                      :disabled="!userId || isUploading(role.gameId, index)"
                      @change="
                        uploadOfferVideo(
                          role.gameId,
                          index,
                          ($event.target as HTMLInputElement).files,
                        )
                      "
                    />
                    <span v-if="isUploading(role.gameId, index)">Upload…</span>
                    <span v-else>Uploader une vidéo</span>
                  </label>
                  <span class="text-[0.7rem] text-slate-300/70">
                    Stockée dans `coach-videos`, URL ajoutée automatiquement.
                  </span>
                </div>
                <p
                  v-if="uploadErrors[uploadKey(role.gameId, index)]"
                  class="text-[0.7rem] text-rose-200/90"
                >
                  {{ uploadErrors[uploadKey(role.gameId, index)] }}
                </p>
              </div>

              <label
                class="inline-flex items-center gap-2 text-xs text-slate-200/85"
              >
                <input
                  :checked="offer.isActive"
                  type="checkbox"
                  class="h-4 w-4 rounded border-white/20 bg-[#0b0f19]/45 text-[#14b8a6] focus:ring-[#14b8a6]/35"
                  @change="
                    updateOfferActive(
                      role.gameId,
                      index,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                />
                Offre active
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="errors?.offers" class="text-[0.7rem] text-rose-200/90">
      {{ errors.offers }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type {
  CoachGameRole,
  CoachingOffer,
  ProfileFieldErrors,
} from "../types/profile";

const props = withDefaults(
  defineProps<{
    modelValue: CoachGameRole[];
    errors?: ProfileFieldErrors;
    userId?: string;
  }>(),
  { errors: () => ({}), userId: undefined },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: CoachGameRole[]): void;
  (e: "validate"): void;
}>();

const client = useSupabaseClient();
const coachRoles = computed(() =>
  props.modelValue.filter((role) => role.selected && role.isCoach),
);
const uploadStates = ref<Record<string, boolean>>({});
const uploadErrors = ref<Record<string, string>>({});

const newOffer = (): CoachingOffer => ({
  hourlyRate: null,
  description: "",
  videoUrls: [],
  isActive: true,
});

const updateRoleOffers = (
  gameId: string,
  updater: (offers: CoachingOffer[]) => CoachingOffer[],
) => {
  const next = props.modelValue.map((role) =>
    role.gameId === gameId
      ? {
          ...role,
          offers: updater(role.offers),
        }
      : role,
  );
  emit("update:modelValue", next);
  emit("validate");
};

const uploadKey = (gameId: string, index: number) => `${gameId}:${index}`;
const isUploading = (gameId: string, index: number) =>
  Boolean(uploadStates.value[uploadKey(gameId, index)]);

const sanitizeFileName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const uploadOfferVideo = async (
  gameId: string,
  index: number,
  files: FileList | null,
) => {
  const key = uploadKey(gameId, index);
  uploadErrors.value[key] = "";

  if (!props.userId) {
    uploadErrors.value[key] = "Session utilisateur introuvable.";
    return;
  }

  const file = files?.[0];
  if (!file) return;

  uploadStates.value[key] = true;
  try {
    const fileName = sanitizeFileName(file.name || "video.mp4");
    const objectPath = `${props.userId}/${gameId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await (client as any).storage
      .from("coach-videos")
      .upload(objectPath, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = (client as any).storage
      .from("coach-videos")
      .getPublicUrl(objectPath);
    const publicUrl = String(publicData?.publicUrl ?? "").trim();
    if (!publicUrl) {
      throw new Error("URL publique introuvable après upload.");
    }

    updateRoleOffers(gameId, (offers) =>
      offers.map((offer, offerIndex) =>
        offerIndex === index
          ? {
              ...offer,
              videoUrls: Array.from(
                new Set([...(offer.videoUrls ?? []), publicUrl]),
              ),
            }
          : offer,
      ),
    );
  } catch (error: any) {
    const message = String(error?.message ?? "").trim();
    uploadErrors.value[key] = message
      ? `Upload impossible: ${message}`
      : "Upload impossible pour le moment.";
  } finally {
    uploadStates.value[key] = false;
  }
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
