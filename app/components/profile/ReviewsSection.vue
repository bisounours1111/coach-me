<script setup lang="ts">
const props = defineProps<{
  coachId: string
}>()

const { getCoachReviews } = useReviews()
const { data: reviews, pending, error } = await useAsyncData(`reviews-${props.coachId}`, () => getCoachReviews(props.coachId))

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="mt-12">
    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <UIcon name="i-heroicons-star" class="text-yellow-400" />
      Avis des élèves
    </h2>

    <div v-if="pending" class="space-y-4">
      <USkeleton v-for="i in 3" :key="i" class="h-32 w-full" />
    </div>

    <div v-else-if="error" class="text-red-500">
      Erreur lors du chargement des avis.
    </div>

    <div v-else-if="reviews && reviews.length > 0" class="space-y-6">
      <div v-for="review in reviews" :key="review.id" class="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <UAvatar
              :src="review.student?.avatar_url || ''"
              :alt="review.student?.full_name || 'Élève'"
              size="sm"
            />
            <div>
              <div class="font-medium text-white">{{ review.student?.full_name || 'Élève anonyme' }}</div>
              <div class="text-xs text-gray-400">{{ formatDate(review.created_at) }}</div>
            </div>
          </div>
          <div class="flex gap-0.5">
            <UIcon
              v-for="i in 5"
              :key="i"
              name="i-heroicons-star-solid"
              class="w-4 h-4"
              :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-600'"
            />
          </div>
        </div>
        <p class="text-gray-300 italic">"{{ review.comment }}"</p>
      </div>
    </div>

    <div v-else class="text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
      <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-12 h-12 text-gray-600 mb-2 mx-auto" />
      <p class="text-gray-400 text-lg">Aucun avis pour le moment.</p>
      <p class="text-gray-500 text-sm">Soyez le premier à laisser un avis après votre session !</p>
    </div>
  </div>
</template>
