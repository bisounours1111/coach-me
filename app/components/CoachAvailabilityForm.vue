<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarOptions, DateSelectArg, EventInput } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useAvailability, splitSelectionIntoHourlySlots, type Availability } from "~/composables/useAvailability";
import { useSessions, type Session, type SessionStatus } from "~/composables/useSessions";

const props = defineProps<{
  userId: string;
}>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return UUID_REGEX.test(raw) ? raw : null;
};

const { getCoachAvailabilities, addAvailabilitySlots, deleteAvailability } = useAvailability();
const { getSessions } = useSessions();

const availabilities = ref<Availability[]>([]);
const bookedSessions = ref<Session[]>([]);
const loading = ref(true);
const creating = ref(false);
const removingIds = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const BOOKED_SESSION_STATUSES: SessionStatus[] = [
  "pending",
  "negotiating",
  "accepted",
  "paid",
  "upcoming",
  "done",
];

const clearMessages = () => {
  errorMessage.value = null;
  successMessage.value = null;
};

const setRemoving = (id: string, removing: boolean) => {
  const next = new Set(removingIds.value);
  if (removing) next.add(id);
  else next.delete(id);
  removingIds.value = Array.from(next);
};

const buildAvailabilityLabel = (availability: Availability) => {
  const start = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(availability.start_at));
  const end = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(availability.end_at));
  return `Disponible ${start}-${end}`;
};

const toAvailabilityEvent = (availability: Availability): EventInput => ({
  id: availability.id,
  title: buildAvailabilityLabel(availability),
  start: availability.start_at,
  end: availability.end_at,
  editable: false,
  overlap: false,
  backgroundColor: "#22c55e",
  borderColor: "#16a34a",
  extendedProps: {
    kind: "availability",
    availabilityId: availability.id,
    status: availability.status,
    deleting: removingIds.value.includes(availability.id),
  },
});

const toBookedEvent = (session: Session): EventInput => ({
  id: `booked-${session.id}`,
  title: "Réservé",
  start: session.start_at,
  end: session.end_at ?? session.start_at,
  editable: false,
  overlap: false,
  backgroundColor: "#3b82f6",
  borderColor: "#2563eb",
  extendedProps: {
    kind: "booked",
    status: session.status,
  },
});

const calendarEvents = computed<EventInput[]>(() => [
  ...availabilities.value.map(toAvailabilityEvent),
  ...bookedSessions.value
    .filter((session) => BOOKED_SESSION_STATUSES.includes(session.status))
    .map(toBookedEvent),
]);

const hasOverlap = (startAt: string, endAt: string) => {
  const slotStart = new Date(startAt).getTime();
  const slotEnd = new Date(endAt).getTime();

  return calendarEvents.value.some((event) => {
    const eventStart = event.start ? new Date(String(event.start)).getTime() : NaN;
    const eventEnd = event.end ? new Date(String(event.end)).getTime() : eventStart;

    if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) {
      return false;
    }

    return slotStart < eventEnd && slotEnd > eventStart;
  });
};

const loadCalendarData = async () => {
  loading.value = true;
  clearMessages();

  try {
    const normalizedUserId = normalizeUuid(props.userId);
    if (!normalizedUserId) {
      throw new Error("Identifiant coach invalide.");
    }

    const [availabilityData, sessionData] = await Promise.all([
      getCoachAvailabilities(normalizedUserId),
      getSessions("coach"),
    ]);

    availabilities.value = availabilityData;
    bookedSessions.value = (sessionData ?? []) as Session[];
  } catch (error: any) {
    console.error(error);
    errorMessage.value =
      String(error?.message ?? "").trim() ||
      "Impossible de charger les disponibilités pour le moment.";
  } finally {
    loading.value = false;
  }
};

const handleCreateSelection = async (selection: DateSelectArg) => {
  if (creating.value) {
    selection.view.calendar.unselect();
    return;
  }

  clearMessages();

  let optimisticRows: Availability[] = [];

  try {
    const slots = splitSelectionIntoHourlySlots({
      start: selection.start,
      end: selection.end,
    });

    if (slots.some((slot) => hasOverlap(slot.start_at, slot.end_at))) {
      throw new Error("Cette plage contient déjà un créneau disponible ou réservé.");
    }

    const seed = Date.now();
    const normalizedUserId = normalizeUuid(props.userId);
    if (!normalizedUserId) {
      throw new Error("Identifiant coach invalide.");
    }

    optimisticRows = slots.map((slot, index) => ({
      id: `tmp-${seed}-${index}`,
      coach_id: normalizedUserId,
      is_active: true,
      ...slot,
    }));

    availabilities.value = [...availabilities.value, ...optimisticRows];
    creating.value = true;

    const createdRows = await addAvailabilitySlots(slots);
    const temporaryIds = new Set(optimisticRows.map((row) => row.id));

    availabilities.value = [
      ...availabilities.value.filter((row) => !temporaryIds.has(row.id)),
      ...createdRows,
    ];

    successMessage.value =
      createdRows.length > 1
        ? `${createdRows.length} créneaux d'une heure ont été ajoutés.`
        : "Le créneau a été ajouté.";
  } catch (error: any) {
    if (optimisticRows.length) {
      const temporaryIds = new Set(optimisticRows.map((row) => row.id));
      availabilities.value = availabilities.value.filter(
        (row) => !temporaryIds.has(row.id),
      );
    }

    console.error(error);
    errorMessage.value =
      String(error?.message ?? "").trim() ||
      "Impossible d'ajouter ce créneau pour le moment.";
  } finally {
    creating.value = false;
    selection.view.calendar.unselect();
  }
};

const handleDeleteAvailability = async (availabilityId: string) => {
  if (removingIds.value.includes(availabilityId)) return;

  clearMessages();

  const previousRows = [...availabilities.value];
  availabilities.value = availabilities.value.filter(
    (availability) => availability.id !== availabilityId,
  );
  setRemoving(availabilityId, true);

  try {
    await deleteAvailability(availabilityId);
    successMessage.value = "Le créneau a été supprimé.";
  } catch (error: any) {
    availabilities.value = previousRows;
    console.error(error);
    errorMessage.value =
      String(error?.message ?? "").trim() ||
      "Impossible de supprimer ce créneau pour le moment.";
  } finally {
    setRemoving(availabilityId, false);
  }
};

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: "timeGridWeek",
  locale: frLocale,
  firstDay: 1,
  weekends: true,
  allDaySlot: false,
  selectable: true,
  selectMirror: true,
  editable: false,
  eventStartEditable: false,
  eventDurationEditable: false,
  nowIndicator: true,
  dayMaxEvents: false,
  expandRows: true,
  height: "100%",
  slotMinTime: "00:00:00",
  slotMaxTime: "24:00:00",
  slotDuration: "01:00:00",
  snapDuration: "01:00:00",
  scrollTime: "08:00:00",
  eventOverlap: false,
  longPressDelay: 150,
  headerToolbar: {
    left: "prev,next",
    center: "title",
    right: "today",
  },
  buttonText: {
    today: "Aujourd'hui",
  },
  titleFormat: {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  dayHeaderFormat: {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  },
  slotLabelFormat: {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
  events: calendarEvents.value,
  select: handleCreateSelection,
  selectAllow: (selection) => {
    try {
      const slots = splitSelectionIntoHourlySlots({
        start: selection.start,
        end: selection.end,
      });

      return slots.every((slot) => !hasOverlap(slot.start_at, slot.end_at));
    } catch {
      return false;
    }
  },
}));

onMounted(loadCalendarData);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div class="space-y-1">
        <h3 class="flex items-center gap-2 text-lg font-bold text-white">
          <UIcon name="i-heroicons-calendar-days" class="text-teal-500" />
          Planning des disponibilités
        </h3>
        <p class="text-xs text-slate-400">
          Clique-glisse sur la semaine pour créer des créneaux d'une heure. Les
          créneaux passés sont bloqués.
        </p>
      </div>

      <div class="flex items-center gap-3 text-xs font-medium text-slate-300">
        <span class="inline-flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Disponible
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Réservé
        </span>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
    >
      {{ successMessage }}
    </div>

    <div
      class="calendar-shell relative overflow-hidden rounded-2xl border border-white/10 bg-[#050812] shadow-2xl shadow-black/20"
    >
      <div
        v-if="loading"
        class="absolute inset-0 z-20 flex items-center justify-center bg-[#050812]/80 backdrop-blur-sm"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="h-8 w-8 animate-spin text-teal-500"
        />
      </div>

      <ClientOnly>
        <FullCalendar :options="calendarOptions">
          <template #eventContent="arg">
            <div class="calendar-event flex h-full w-full items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-[10px] font-semibold uppercase tracking-wide">
                  {{ arg.event.extendedProps.kind === "booked" ? "Réservé" : "Disponible" }}
                </p>
                <p class="truncate text-[11px] font-bold">
                  {{ arg.timeText }}
                </p>
              </div>

              <button
                v-if="arg.event.extendedProps.kind === 'availability'"
                type="button"
                class="calendar-delete shrink-0 rounded-full border border-white/20 bg-black/20 p-1 text-white transition hover:bg-black/40"
                :disabled="arg.event.extendedProps.deleting"
                @click.stop="handleDeleteAvailability(arg.event.extendedProps.availabilityId)"
              >
                <UIcon
                  :name="
                    arg.event.extendedProps.deleting
                      ? 'i-heroicons-arrow-path'
                      : 'i-heroicons-x-mark'
                  "
                  class="h-3.5 w-3.5"
                  :class="{ 'animate-spin': arg.event.extendedProps.deleting }"
                />
              </button>
            </div>
          </template>
        </FullCalendar>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.calendar-shell {
  height: 78vh;
  min-height: 700px;
}

@media (max-width: 768px) {
  .calendar-shell {
    height: 70vh;
    min-height: 560px;
  }
}

:deep(.fc) {
  height: 100%;
  color: #e2e8f0;
}

:deep(.fc-theme-standard td),
:deep(.fc-theme-standard th),
:deep(.fc-theme-standard .fc-scrollgrid) {
  border-color: rgba(255, 255, 255, 0.08);
}

:deep(.fc .fc-toolbar.fc-header-toolbar) {
  margin-bottom: 1rem;
  padding: 1rem 1rem 0;
}

:deep(.fc .fc-toolbar-title) {
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

:deep(.fc .fc-button) {
  border: 0;
  background: rgba(20, 184, 166, 0.14);
  color: #ccfbf1;
  box-shadow: none;
}

:deep(.fc .fc-button:hover),
:deep(.fc .fc-button:focus),
:deep(.fc .fc-button:active) {
  background: rgba(20, 184, 166, 0.24);
  box-shadow: none;
}

:deep(.fc .fc-timegrid-slot) {
  height: 3.4rem;
}

:deep(.fc .fc-col-header-cell-cushion),
:deep(.fc .fc-timegrid-axis-cushion) {
  color: #cbd5e1;
}

:deep(.fc .fc-timegrid-now-indicator-line) {
  border-color: rgba(20, 184, 166, 0.85);
}

:deep(.fc .fc-event) {
  border-radius: 0.9rem;
  padding: 0;
  box-shadow: none;
}

:deep(.fc .fc-event-main) {
  padding: 0.4rem 0.45rem;
}

:deep(.fc .fc-timegrid-event) {
  inset-inline: 2px;
}

:deep(.fc .fc-scroller) {
  overflow: auto !important;
}

.calendar-event {
  line-height: 1.1;
}

.calendar-delete:disabled {
  opacity: 0.65;
  cursor: wait;
}
</style>
