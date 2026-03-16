<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-10">
    <AuthCard
      title="Créer un compte"
      subtitle="Choisis ton rôle, crée ton compte, puis connecte-toi."
    >
      <AuthRegisterForm />

      <p class="mt-4 text-center text-xs text-slate-300/80">
        Déjà un compte ?
        <NuxtLink to="/auth/login" class="font-medium text-[#14b8a6] hover:text-[#14b8a6]/90">
          Se connecter
        </NuxtLink>
      </p>
    </AuthCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth" });

useHead({
  title: "Créer un compte · CoachMe",
});
</script>

