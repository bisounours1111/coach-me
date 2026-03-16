export const useCheckout = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const startCheckout = async (params: {
    coachingId: string;
    profileId: string;
    gameName: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const { url } = await $fetch<{ url: string }>(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",
          body: params,
        },
      );

      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      error.value =
        err?.data?.message ||
        "Impossible de démarrer le paiement. Réessaie plus tard.";
    } finally {
      loading.value = false;
    }
  };

  return { startCheckout, loading, error };
};
