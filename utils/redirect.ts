import type { Router } from "vue-router";
import type { UserRole } from "../types/auth";

export const redirectByRole = async (router: Router, role: UserRole | null | undefined) => {
  if (!role) {
    await router.push("/onboarding/preferences");
    return;
  }

  if (role === "coach") {
    await router.push("/dashboard/coach");
    return;
  }

  await router.push("/dashboard/student");
};

