<template>
  <section class="space-y-8">
    <div class="space-y-2">
      <p class="text-xs text-slate-200/80">
        Renseigne ton identité, ta bio et tes liens sociaux.
      </p>
    </div>

    <!-- Identité (Username & Avatar) -->
    <div class="grid gap-6 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-slate-200/90" for="coach-name"
          >Nom complet / Pseudo</label
        >
        <input
          id="coach-name"
          v-model="localValue.fullName"
          type="text"
          class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
          placeholder="Ton nom ou pseudo visible"
          @input="emitValidate"
        />
        <p v-if="errors?.fullName" class="text-[0.7rem] text-rose-200/90">
          {{ errors.fullName }}
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-slate-200/90" for="coach-avatar"
          >Photo de profil</label
        >
        <div class="flex items-center gap-4">
          <!-- Preview -->
          <div
            class="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 group"
          >
            <img
              v-if="localValue.avatarUrl"
              :src="localValue.avatarUrl"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-slate-500"
            >
              <UIcon name="i-heroicons-user" class="h-8 w-8" />
            </div>

            <!-- Loading overlay -->
            <div
              v-if="uploading"
              class="absolute inset-0 flex items-center justify-center bg-[#0b0f19]/80 backdrop-blur-sm"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="h-5 w-5 animate-spin text-teal-400"
              />
            </div>
          </div>

          <!-- Upload Actions -->
          <div class="flex flex-1 flex-col gap-2">
            <div class="flex gap-2">
              <label
                class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
              >
                <UIcon name="i-heroicons-cloud-arrow-up" class="h-4 w-4" />
                {{ uploading ? "Envoi..." : "Choisir une photo" }}
                <input
                  type="file"
                  class="hidden"
                  accept="image/*"
                  :disabled="uploading"
                  @change="handleFileUpload"
                />
              </label>

              <button
                v-if="localValue.avatarUrl"
                type="button"
                class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/10 active:scale-95"
                @click="removeAvatar"
              >
                <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                Supprimer
              </button>
            </div>
            <p class="text-[10px] text-slate-500">JPG, PNG ou WebP. Max 2Mo.</p>
          </div>
        </div>
        <p v-if="errors?.avatarUrl" class="text-[0.7rem] text-rose-200/90">
          {{ errors.avatarUrl }}
        </p>
      </div>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-200/90" for="coach-bio"
        >Bio</label
      >
      <textarea
        id="coach-bio"
        v-model="localValue.bio"
        rows="5"
        class="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
        placeholder="Ton parcours, ta façon de coacher, ce que tu proposes…"
        maxlength="500"
        @input="emitValidate"
      />
      <p v-if="errors?.bio" class="text-[0.7rem] text-rose-200/90">
        {{ errors.bio }}
      </p>
    </div>

    <div class="space-y-3">
      <p class="text-xs font-medium text-slate-200/90">
        Liens de contact (optionnels)
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label
            class="text-xs font-medium text-slate-200/90"
            for="contact-website"
            >Site</label
          >
          <input
            id="contact-website"
            v-model="localValue.socialLinks.website"
            type="url"
            inputmode="url"
            placeholder="https://ton-site.com"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p
            v-if="errors?.['socialLinks.website']"
            class="text-[0.7rem] text-rose-200/90"
          >
            {{ errors["socialLinks.website"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label
            class="text-xs font-medium text-slate-200/90"
            for="contact-youtube"
            >YouTube</label
          >
          <input
            id="contact-youtube"
            v-model="localValue.socialLinks.youtube"
            type="url"
            inputmode="url"
            placeholder="https://youtube.com/@…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p
            v-if="errors?.['socialLinks.youtube']"
            class="text-[0.7rem] text-rose-200/90"
          >
            {{ errors["socialLinks.youtube"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label
            class="text-xs font-medium text-slate-200/90"
            for="contact-twitch"
            >Twitch</label
          >
          <input
            id="contact-twitch"
            v-model="localValue.socialLinks.twitch"
            type="url"
            inputmode="url"
            placeholder="https://twitch.tv/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p
            v-if="errors?.['socialLinks.twitch']"
            class="text-[0.7rem] text-rose-200/90"
          >
            {{ errors["socialLinks.twitch"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label
            class="text-xs font-medium text-slate-200/90"
            for="contact-twitter"
            >X / Twitter</label
          >
          <input
            id="contact-twitter"
            v-model="localValue.socialLinks.twitter"
            type="url"
            inputmode="url"
            placeholder="https://x.com/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p
            v-if="errors?.['socialLinks.twitter']"
            class="text-[0.7rem] text-rose-200/90"
          >
            {{ errors["socialLinks.twitter"] }}
          </p>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label
            class="text-xs font-medium text-slate-200/90"
            for="contact-discord"
            >Discord</label
          >
          <input
            id="contact-discord"
            v-model="localValue.socialLinks.discord"
            type="url"
            inputmode="url"
            placeholder="https://discord.gg/… (ou ton serveur/URL)"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p
            v-if="errors?.['socialLinks.discord']"
            class="text-[0.7rem] text-rose-200/90"
          >
            {{ errors["socialLinks.discord"] }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProfileFieldErrors, ProfileFormData } from "../types/profile";

const props = withDefaults(
  defineProps<{
    modelValue: ProfileFormData;
    errors?: ProfileFieldErrors;
    userId?: string;
  }>(),
  {
    errors: () => ({}),
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: ProfileFormData): void;
  (e: "validate"): void;
}>();

const { uploadAvatar } = useCoachProfile();
const uploading = ref(false);

const localValue = computed({
  get: () => props.modelValue,
  set: (value: ProfileFormData) => emit("update:modelValue", value),
});

const emitValidate = () => emit("validate");

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !props.userId) return;

  // Validation taille (2Mo)
  if (file.size > 2 * 1024 * 1024) {
    alert("Le fichier est trop volumineux (max 2Mo)");
    return;
  }

  uploading.value = true;
  try {
    const publicUrl = await uploadAvatar(props.userId, file);
    localValue.value = {
      ...localValue.value,
      avatarUrl: publicUrl,
    };
    emitValidate();
  } catch (error: any) {
    console.error("Erreur upload:", error);
    alert("Erreur lors de l'envoi de l'image.");
  } finally {
    uploading.value = false;
    // Reset input
    target.value = "";
  }
};

const removeAvatar = () => {
  localValue.value = {
    ...localValue.value,
    avatarUrl: "",
  };
  emitValidate();
};
</script>
