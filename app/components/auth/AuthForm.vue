<template>
  <form class="space-y-4" @submit.prevent="emitSubmit">
    <AuthTextField
      :model-value="localEmail"
      id="email"
      label="Email"
      type="email"
      inputmode="email"
      placeholder="toi@example.com"
      autocomplete="email"
      @update:model-value="localEmail = $event"
    />

    <AuthPasswordField
      :model-value="localPassword"
      id="password"
      label="Mot de passe"
      autocomplete="current-password"
      @update:model-value="localPassword = $event"
    />

    <slot name="extra" />

    <div
      v-if="errorMessage"
      class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
    >
      {{ errorMessage }}
    </div>

    <AuthSubmitButton :loading="loading">
      <slot name="submit-label">Continuer</slot>
    </AuthSubmitButton>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValueEmail?: string;
  modelValuePassword?: string;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValueEmail", value: string): void;
  (e: "update:modelValuePassword", value: string): void;
  (e: "submit"): void;
}>();

const localEmail = computed({
  get: () => props.modelValueEmail ?? "",
  set: (value: string) => emit("update:modelValueEmail", value),
});

const localPassword = computed({
  get: () => props.modelValuePassword ?? "",
  set: (value: string) => emit("update:modelValuePassword", value),
});

const loading = computed(() => props.loading ?? false);
const errorMessage = computed(() => props.errorMessage ?? null);

const emitSubmit = () => {
  if (!loading.value) {
    emit("submit");
  }
};
</script>

