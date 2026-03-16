<template>
  <section class="space-y-5">
    <div class="space-y-2">
      <p class="text-xs text-slate-200/80">
        Renseigne ta bio et tes liens sociaux de portfolio.
      </p>
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
        @input="emitValidate"
      />
      <p v-if="errors?.bio" class="text-[0.7rem] text-rose-200/90">{{ errors.bio }}</p>
    </div>

    <div class="space-y-3">
      <p class="text-xs font-medium text-slate-200/90">Liens de contact (optionnels)</p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-website">Site</label>
          <input
            id="contact-website"
            v-model="localValue.socialLinks.website"
            type="url"
            inputmode="url"
            placeholder="https://ton-site.com"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['socialLinks.website']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["socialLinks.website"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-youtube">YouTube</label>
          <input
            id="contact-youtube"
            v-model="localValue.socialLinks.youtube"
            type="url"
            inputmode="url"
            placeholder="https://youtube.com/@…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['socialLinks.youtube']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["socialLinks.youtube"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-twitch">Twitch</label>
          <input
            id="contact-twitch"
            v-model="localValue.socialLinks.twitch"
            type="url"
            inputmode="url"
            placeholder="https://twitch.tv/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['socialLinks.twitch']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["socialLinks.twitch"] }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-200/90" for="contact-twitter">X / Twitter</label>
          <input
            id="contact-twitter"
            v-model="localValue.socialLinks.twitter"
            type="url"
            inputmode="url"
            placeholder="https://x.com/…"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['socialLinks.twitter']" class="text-[0.7rem] text-rose-200/90">
            {{ errors["socialLinks.twitter"] }}
          </p>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-xs font-medium text-slate-200/90" for="contact-discord">Discord</label>
          <input
            id="contact-discord"
            v-model="localValue.socialLinks.discord"
            type="url"
            inputmode="url"
            placeholder="https://discord.gg/… (ou ton serveur/URL)"
            class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
            @input="emitValidate"
          />
          <p v-if="errors?.['socialLinks.discord']" class="text-[0.7rem] text-rose-200/90">
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
  }>(),
  {
    errors: () => ({}),
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: ProfileFormData): void;
  (e: "validate"): void;
}>();

const localValue = computed({
  get: () => props.modelValue,
  set: (value: ProfileFormData) => emit("update:modelValue", value),
});

const emitValidate = () => emit("validate");
</script>

