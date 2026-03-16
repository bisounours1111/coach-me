<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <div class="space-y-2">
      <p class="text-xs text-slate-200/80">
        Renseigne tes jeux principaux, ton rang, une bio, et éventuellement des liens (vidéo + contacts).
      </p>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium text-slate-200/90">Jeux & rangs</p>
      </div>
      <GameSelector v-model="localValue.games" />
      <p v-if="errors?.games" class="text-[0.7rem] text-rose-200/90">{{ errors.games }}</p>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-200/90" for="coach-bio">Bio</label>
      <textarea
        id="coach-bio"
        v-model="localValue.bio"
        rows="5"
        class="w-full resize-none rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
        placeholder="Ton parcours, ta façon de coacher, ce que tu proposes…"
        maxlength="500"
        required
        @input="emitValidate"
      />
      <p v-if="errors?.bio" class="text-[0.7rem] text-rose-200/90">{{ errors.bio }}</p>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs font-medium text-slate-200/90" for="coach-video">Lien vidéo (optionnel)</label>
      <input
        id="coach-video"
        v-model="localValue.videoUrl"
        type="url"
        inputmode="url"
        placeholder="https://youtube.com/…"
        class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
        @input="emitValidate"
      />
      <p v-if="errors?.videoUrl" class="text-[0.7rem] text-rose-200/90">{{ errors.videoUrl }}</p>
    </div>

    <div class="space-y-3">
      <p class="text-xs font-medium text-slate-200/90">Liens de contact (optionnels)</p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-website">Site</label>
          <input
            id="contact-website"
            v-model="localValue.contact.website"
            type="url"
            inputmode="url"
            placeholder="https://ton-site.com"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['contact.website']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["contact.website"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-youtube">YouTube</label>
          <input
            id="contact-youtube"
            v-model="localValue.contact.youtube"
            type="url"
            inputmode="url"
            placeholder="https://youtube.com/@…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['contact.youtube']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["contact.youtube"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-twitch">Twitch</label>
          <input
            id="contact-twitch"
            v-model="localValue.contact.twitch"
            type="url"
            inputmode="url"
            placeholder="https://twitch.tv/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['contact.twitch']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["contact.twitch"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-twitter">X / Twitter</label>
          <input
            id="contact-twitter"
            v-model="localValue.contact.twitter"
            type="url"
            inputmode="url"
            placeholder="https://x.com/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['contact.twitter']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["contact.twitter"] }}
          </p>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-xs font-medium text-slate-200/90" for="contact-discord">Discord</label>
          <input
            id="contact-discord"
            v-model="localValue.contact.discord"
            type="url"
            inputmode="url"
            placeholder="https://discord.gg/… (ou ton serveur/URL)"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['contact.discord']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["contact.discord"] }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="globalError" class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90">
      {{ globalError }}
    </div>

    <div v-if="successMessage" class="rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90">
      {{ successMessage }}
    </div>

    <button
      type="submit"
      class="inline-flex w-full items-center justify-center rounded-xl bg-[#14b8a6] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#14b8a6]/90 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
    >
      <span v-if="loading">Enregistrement…</span>
      <span v-else>Enregistrer</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import type { ProfileFieldErrors, ProfileFormData } from "../../types/profile";

const props = withDefaults(
  defineProps<{
    modelValue: ProfileFormData;
    errors?: ProfileFieldErrors;
    loading?: boolean;
    globalError?: string | null;
    successMessage?: string | null;
  }>(),
  {
    errors: () => ({}),
    loading: false,
    globalError: null,
    successMessage: null,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: ProfileFormData): void;
  (e: "submit"): void;
  (e: "validate"): void;
}>();

const localValue = computed({
  get: () => props.modelValue,
  set: (value: ProfileFormData) => emit("update:modelValue", value),
});

const emitValidate = () => emit("validate");

const onSubmit = () => emit("submit");
</script>

