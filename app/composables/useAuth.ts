import type { UserRole } from "~/types/auth";

export const useAuth = () => {
  const client = useSupabaseClient();
  const router = useRouter();
  const user = useSupabaseUser();

  const loading = ref(false);
  const error = ref<string | null>(null);

  const signIn = async (email: string, password: string) => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    loading.value = false;

    if (signInError) {
      error.value =
        signInError.message ||
        "Impossible de se connecter. Vérifie tes identifiants.";
      throw signInError;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    username?: string,
  ) => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: username,
        },
      },
    });

    loading.value = false;

    if (signUpError) {
      error.value = signUpError.message || "Impossible de créer le compte.";
      throw signUpError;
    }

    if (data.user && data.session) {
      await router.push("/dashboard");
    }

    return data.user ?? null;
  };

  const signOut = async () => {
    await client.auth.signOut();
    await router.push("/auth/login");
  };

  const getCurrentUser = () => user.value;

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    getCurrentUser,
  };
};
