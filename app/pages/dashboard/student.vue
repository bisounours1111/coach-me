<template>
  <div class="min-h-screen px-4 py-10">
    <h1 class="text-2xl font-semibold text-slate-50">Dashboard élève</h1>
    <p class="mt-2 text-sm text-slate-300/85">
      Espace élève. Le contenu sera implémenté dans une prochaine étape.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "student",
});

useHead({
  title: "Dashboard élève · Coach Me",
});
</script>

