<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-10">
    <AuthCard
      title="Préférences de jeux"
      subtitle="Dis-nous à quels jeux tu joues et où tu veux progresser."
    >
      <GamePreferencesForm />
    </AuthCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth" });

useHead({
  title: "Préférences de jeux · Coach Me",
});
</script>

