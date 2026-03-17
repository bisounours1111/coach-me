/** State global pour la pop-up de messagerie (ouvert/fermé, ouvrir avec un coach donné) */
export const useMessagingPanel = () => {
  const isOpen = useState("messaging-panel-open", () => false);
  const openWithCoachId = useState<string | null>("messaging-panel-coach-id", () => null);

  const setOpen = (open: boolean) => {
    isOpen.value = open;
    if (!open) openWithCoachId.value = null;
  };

  const openWithCoach = (coachId: string) => {
    openWithCoachId.value = coachId;
    isOpen.value = true;
  };

  const clearOpenWithCoach = () => {
    openWithCoachId.value = null;
  };

  return {
    isOpen,
    openWithCoachId,
    setOpen,
    openWithCoach,
    clearOpenWithCoach,
  };
};
