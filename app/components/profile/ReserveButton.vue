<script setup lang="ts">
const props = defineProps<{
  coachId: string
  price: number
  currency: string
}>()

const user = useSupabaseUser()
const router = useRouter()

const handleReserve = () => {
  if (!user.value) {
    // Rediriger vers la connexion si non connecté
    router.push('/login?redirect=' + router.currentRoute.value.fullPath)
    return
  }
  
  // Rediriger vers le processus de réservation (Phase 3 - Stripe)
  // Pour l'instant, on peut rediriger vers une page de création de session
  router.push(`/coach/${props.coachId}/reserve`)
}
</script>

<template>
  <UButton
    block
    size="xl"
    color="primary"
    class="font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-transform"
    @click="handleReserve"
  >
    Réserver une session
    <template #trailing>
      <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
    </template>
  </UButton>
</template>
