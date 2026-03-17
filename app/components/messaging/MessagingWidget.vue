<script setup lang="ts">
import type { ConversationWithOther, MessageWithSender } from "~/composables/useMessaging";

const props = defineProps<{
  open: boolean;
  openWithCoachId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const client = useSupabaseClient();
const { clearOpenWithCoach } = useMessagingPanel();
const {
  getCurrentUserId,
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  subscribeToMessages,
} = useMessaging();

const view = ref<"list" | "conversation">("list");
const currentConversationId = ref<string | null>(null);
const currentOther = ref<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);

const conversations = ref<ConversationWithOther[]>([]);
const messages = ref<MessageWithSender[]>([]);
const loadingList = ref(false);
const loadingMessages = ref(false);
const sendError = ref<string | null>(null);
const listError = ref<string | null>(null);
const newMessageText = ref("");
const sending = ref(false);
let unsubscribeRealtime: (() => void) | null = null;

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

const currentUserId = computed(() => getCurrentUserId());

async function loadConversations() {
  loadingList.value = true;
  listError.value = null;
  try {
    conversations.value = await listConversations();
  } catch (e: any) {
    listError.value = e?.message ?? "Impossible de charger les conversations.";
  } finally {
    loadingList.value = false;
  }
}

async function openConversationWithCoach(coachId: string) {
  const conv = await getOrCreateConversation(coachId);
  if (!conv) return;
  const { data: profile } = await (client as any)
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", coachId)
    .maybeSingle();
  currentOther.value = profile
    ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url }
    : { id: coachId, full_name: null, avatar_url: null };
  currentConversationId.value = conv.id;
  view.value = "conversation";
  await loadMessages(conv.id);
  startRealtime(conv.id);
}

async function loadMessages(conversationId: string) {
  loadingMessages.value = true;
  try {
    const list = await getMessages(conversationId);
    messages.value = list;
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) currentOther.value = conv.other;
  } catch {
    messages.value = [];
  } finally {
    loadingMessages.value = false;
  }
}

function startRealtime(conversationId: string) {
  if (unsubscribeRealtime) unsubscribeRealtime();
  unsubscribeRealtime = subscribeToMessages(conversationId, (payload) => {
    const incomingId = (payload as any)?.new?.id;
    if (incomingId && messages.value.some((m) => m.id === incomingId)) return;
    messages.value = [
      ...messages.value,
      {
        ...payload.new,
        sender: {
          id: payload.new.sender_id,
          full_name: null,
          avatar_url: null,
        },
      } as MessageWithSender,
    ];
  });
}

function stopRealtime() {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
}

async function selectConversation(conv: ConversationWithOther) {
  currentConversationId.value = conv.id;
  currentOther.value = conv.other;
  view.value = "conversation";
  await loadMessages(conv.id);
  startRealtime(conv.id);
}

async function backToList() {
  stopRealtime();
  clearOpenWithCoach();
  view.value = "list";
  currentConversationId.value = null;
  currentOther.value = null;
  messages.value = [];
  await loadConversations();
}

async function handleSend() {
  const text = newMessageText.value.trim();
  const cid = currentConversationId.value;
  if (!text || !cid) return;
  sendError.value = null;
  sending.value = true;
  try {
    const msg = await sendMessage(cid, text);
    if (msg) {
      newMessageText.value = "";
      if (!messages.value.some((m) => m.id === msg.id)) {
        messages.value = [...messages.value, msg];
      }
    }
  } catch (e: any) {
    sendError.value = e?.message ?? "Envoi impossible.";
  } finally {
    sending.value = false;
  }
}

function handleClose() {
  backToList();
  emit("close");
}

watch(
  () => [props.open, props.openWithCoachId] as const,
  async ([open, coachId]) => {
    if (!open) {
      backToList();
      return;
    }
    if (coachId) {
      await openConversationWithCoach(coachId);
    } else {
      view.value = "list";
      await loadConversations();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  stopRealtime();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-end justify-end p-0 sm:p-4"
      aria-label="Messagerie"
    >
      <div
        class="absolute inset-0 bg-black/50"
        aria-hidden="true"
        @click="handleClose"
      />
      <div
        class="relative flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-white/10 bg-[#0b0f19] shadow-2xl sm:h-[520px] sm:rounded-2xl"
        role="dialog"
        aria-labelledby="messaging-title"
      >
        <!-- Header -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <button
              v-if="view === 'conversation'"
              type="button"
              class="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Retour à la liste"
              @click="backToList"
            >
              <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
            </button>
            <h2
              id="messaging-title"
              class="text-lg font-bold text-white"
            >
              {{ view === "list" ? "Messages" : (currentOther?.full_name ?? "Conversation") }}
            </h2>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
            @click="handleClose"
          >
            <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
          </button>
        </div>

        <!-- List view -->
        <div
          v-if="view === 'list'"
          class="flex flex-1 flex-col overflow-hidden"
        >
          <div
            v-if="loadingList"
            class="flex flex-1 items-center justify-center p-8"
          >
            <div
              class="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500"
            />
          </div>
          <div
            v-else-if="listError"
            class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
          >
            <p class="text-sm text-rose-400">{{ listError }}</p>
            <button
              type="button"
              class="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              @click="loadConversations"
            >
              Réessayer
            </button>
          </div>
          <div
            v-else-if="conversations.length === 0"
            class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500"
          >
            <UIcon name="i-heroicons-chat-bubble-left-right" class="h-12 w-12 opacity-50" />
            <p class="text-sm">Aucune conversation.</p>
            <p class="text-xs">Envoyez un message depuis le profil d’un coach.</p>
          </div>
          <ul
            v-else
            class="flex-1 overflow-y-auto"
          >
            <li
              v-for="conv in conversations"
              :key="conv.id"
              class="border-b border-white/5"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
                @click="selectConversation(conv)"
              >
                <img
                  :src="conv.other.avatar_url || DEFAULT_AVATAR"
                  :alt="conv.other.full_name ?? ''"
                  class="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-white">
                    {{ conv.other.full_name ?? "Profil" }}
                  </p>
                  <p
                    v-if="conv.lastMessage"
                    class="truncate text-xs text-slate-500"
                  >
                    {{ conv.lastMessage.content }}
                  </p>
                </div>
                <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 shrink-0 text-slate-500" />
              </button>
            </li>
          </ul>
        </div>

        <!-- Conversation view -->
        <template v-else>
          <div
            v-if="loadingMessages"
            class="flex flex-1 items-center justify-center"
          >
            <div
              class="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500"
            />
          </div>
          <div
            v-else
            class="flex flex-1 flex-col overflow-hidden"
          >
            <div
              class="flex-1 space-y-3 overflow-y-auto p-4"
            >
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-3"
                :class="msg.sender_id === currentUserId ? 'flex-row-reverse' : ''"
              >
                <img
                  :src="msg.sender?.avatar_url || DEFAULT_AVATAR"
                  :alt="msg.sender?.full_name ?? ''"
                  class="h-8 w-8 shrink-0 rounded-full object-cover"
                />
                <div
                  class="max-w-[75%] rounded-2xl px-4 py-2"
                  :class="
                    msg.sender_id === currentUserId
                      ? 'bg-teal-500/20 text-white'
                      : 'bg-white/10 text-slate-200'
                 "
                >
                  <p class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</p>
                  <p
                    class="mt-1 text-[10px] opacity-70"
                  >
                    {{ new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="shrink-0 border-t border-white/10 p-3">
              <form
                class="flex gap-2"
                @submit.prevent="handleSend"
              >
                <input
                  v-model="newMessageText"
                  type="text"
                  placeholder="Écrire un message..."
                  class="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                  :disabled="sending"
                />
                <button
                  type="submit"
                  class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-500 text-white transition hover:bg-teal-400 disabled:opacity-50"
                  :disabled="sending || !newMessageText.trim()"
                  aria-label="Envoyer"
                >
                  <UIcon name="i-heroicons-paper-airplane" class="h-5 w-5" />
                </button>
              </form>
              <p
                v-if="sendError"
                class="mt-2 text-xs text-rose-400"
              >
                {{ sendError }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
