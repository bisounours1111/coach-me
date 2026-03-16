import type { Router } from "vue-router";
import type { UserRole } from "../../../types/auth";

export const redirectByRole = async (
  router: Router,
  userRole: UserRole | null | undefined,
) => {
  if (!userRole) {
    await router.push("/onboarding/preferences");
    return;
  }

  if (userRole === "maintainer") {
    await router.push("/dashboard/admin");
    return;
  }

  if (userRole === "coach") {
    await router.push("/dashboard/coach");
    return;
  }

  await router.push("/dashboard/student");
};
