<script setup lang="ts">
const { isOpen, openWithCoachId, setOpen, clearOpenWithCoach } = useMessagingPanel();
const user = useSupabaseUser();

const showMessagingButton = computed(() => !!user.value);
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050812] text-slate-50">
    <!-- Background gradients -->
    <div class="pointer-events-none absolute inset-0 opacity-90">
      <div
        class="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.14),transparent_60%)]"
      />
      <div
        class="absolute inset-0 bg-[radial-gradient(1000px_circle_at_85%_85%,rgba(20,184,166,0.10),transparent_62%)]"
      />
      <div
        class="absolute inset-0 app-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)]"
      />
      <div class="absolute inset-0 app-noise opacity-[0.06]" />
    </div>

    <!-- Content -->
    <div class="relative flex min-h-screen flex-col">
      <AppNavbar />
      <main class="flex-1">
        <slot />
      </main>

      <!-- Bouton fixe messagerie (visible si connecté) -->
      <button
        v-if="showMessagingButton"
        type="button"
        class="fixed bottom-6 right-6 z-[90] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-900/30 transition hover:scale-105 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-[#050812]"
        aria-label="Ouvrir la messagerie"
        @click="setOpen(!isOpen)"
      >
        <UIcon name="i-heroicons-chat-bubble-left-right" class="h-6 w-6" />
      </button>

      <!-- Pop-up messagerie -->
      <MessagingWidget
        :open="isOpen"
        :open-with-coach-id="openWithCoachId"
        @close="setOpen(false); clearOpenWithCoach()"
      />
    </div>
  </div>
</template>
