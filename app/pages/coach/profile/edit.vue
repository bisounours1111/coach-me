<template>
  <div class="min-h-screen px-4 py-10">
    <div class="mx-auto w-full max-w-3xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-50">
          Éditer mon profil coach
        </h1>
        <p class="mt-2 text-sm text-slate-300/85">
          Ces informations seront visibles sur ton portfolio.
        </p>
      </div>

      <div
        v-if="loading"
        class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-6 text-sm text-slate-200/80 backdrop-blur"
      >
        Chargement…
      </div>

      <div
        v-else
        class="rounded-2xl border border-white/10 bg-[#0b0f19]/45 p-6 backdrop-blur"
      >
        <CoachProfileForm
          v-model="formData"
          :errors="fieldErrors"
          :loading="saving"
          :global-error="saveError"
          :success-message="successMessage"
          @submit="onSave"
          @validate="onValidate"
        />

        <div
          v-if="loadError"
          class="mt-4 rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
        >
          {{ loadError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["coach-only"],
});

useHead({
  title: "Profil coach · Édition · CoachMe",
});

const user = useSupabaseUser();
const {
  loading,
  saving,
  loadError,
  saveError,
  successMessage,
  formData,
  fieldErrors,
  load,
  validateProfileData,
  updateCoachProfile,
  clearMessages,
} = useCoachProfile();

onMounted(async () => {
  if (!user.value) return;
  await load(user.value.id);
});

watch(
  () => user.value?.id,
  async (id) => {
    if (!id) return;
    await load(id);
  },
);

const onValidate = () => {
  clearMessages();
  validateProfileData(formData.value);
};

const onSave = async () => {
  const id = user.value?.id;
  if (!id) return;
  await updateCoachProfile(id, formData.value);
};
</script>
