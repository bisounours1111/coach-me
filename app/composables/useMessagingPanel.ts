/** State global pour la pop-up de messagerie (ouvert/fermé, ouvrir avec un coach donné) */
export const useMessagingPanel = () => {
  const isOpen = useState("messaging-panel-open", () => false);
  const openWithCoachId = useState<string | null>("messaging-panel-coach-id", () => null);
  const hasUnread = useState("messaging-panel-has-unread", () => false);
  const activeConversationId = useState<string | null>("messaging-panel-active-conversation-id", () => null);

  const setOpen = (open: boolean) => {
    isOpen.value = open;
    if (!open) activeConversationId.value = null;
    if (!open) openWithCoachId.value = null;
    if (open) hasUnread.value = false;
  };

  const openWithCoach = (coachId: string) => {
    openWithCoachId.value = coachId;
    isOpen.value = true;
    hasUnread.value = false;
  };

  const clearOpenWithCoach = () => {
    openWithCoachId.value = null;
  };

  const setActiveConversation = (conversationId: string | null) => {
    activeConversationId.value = conversationId;
    if (conversationId) hasUnread.value = false;
  };

  const markUnread = () => {
    if (!isOpen.value) hasUnread.value = true;
  };

  return {
    isOpen,
    openWithCoachId,
    hasUnread,
    activeConversationId,
    setOpen,
    openWithCoach,
    clearOpenWithCoach,
    setActiveConversation,
    markUnread,
  };
};
