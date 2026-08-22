/* ============================================================
   Privé Cartel chain operations dashboard
   Local draft editor for data/chain-schedule.json.
   ============================================================ */

(() => {
  "use strict";

  const DRAFT_STORAGE_KEY = "pcChainScheduleDashboardDraftV1";
  const GITHUB_EDIT_URL = "https://github.com/Skillerious87/privecartel.io/edit/main/data/chain-schedule.json";
  const STATUS_LABELS = {
    confirmed: "Confirmed",
    planning: "Planning",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  const VIEW_META = {
    overview: { label: "Overview", title: "Command overview" },
    schedule: { label: "Schedule", title: "Schedule manager" },
    editor: { label: "Chain editor", title: "Edit chain details" },
    publish: { label: "Publish", title: "Publish centre" }
  };
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DEFAULT_SCHEDULE = {
    schemaVersion: 1,
    timeZone: "UTC",
    timeZoneLabel: "TCT",
    updatedAt: "",
    events: []
  };

  const form = document.querySelector("[data-chain-form]");
  const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
  if (!form || !viewPanels.length) return;

  const elements = {
    sidebar: document.querySelector("[data-sidebar]"),
    sidebarOpen: document.querySelector("[data-sidebar-open]"),
    sidebarClose: document.querySelector("[data-sidebar-close]"),
    viewLabel: document.querySelector("[data-view-label]"),
    viewTitle: document.querySelector("[data-view-title]"),
    saveState: document.querySelector("[data-save-state]"),
    saveCopy: document.querySelector("[data-save-copy]"),
    sidebarEventCount: document.querySelector("[data-sidebar-event-count]"),
    metricUpcoming: document.querySelector("[data-metric-upcoming]"),
    metricUpcomingCopy: document.querySelector("[data-metric-upcoming-copy]"),
    metricConfirmed: document.querySelector("[data-metric-confirmed]"),
    metricPlanning: document.querySelector("[data-metric-planning]"),
    metricNext: document.querySelector("[data-metric-next]"),
    metricNextCopy: document.querySelector("[data-metric-next-copy]"),
    overviewNext: document.querySelector("[data-overview-next]"),
    nextStatus: document.querySelector("[data-next-status]"),
    overviewQueue: document.querySelector("[data-overview-queue]"),
    overviewCalendar: document.querySelector("[data-overview-calendar]"),
    overviewMonth: document.querySelector("[data-overview-month]"),
    scheduleCalendar: document.querySelector("[data-schedule-calendar]"),
    scheduleMonth: document.querySelector("[data-schedule-month]"),
    eventList: document.querySelector("[data-event-list]"),
    eventListTitle: document.querySelector("[data-event-list-title]"),
    eventSearch: document.querySelector("[data-event-search]"),
    eventStatusFilter: document.querySelector("[data-event-status-filter]"),
    clearDateFilter: document.querySelector("[data-clear-date-filter]"),
    editorHeading: document.querySelector("[data-editor-heading]"),
    eventId: document.querySelector("[data-event-id]"),
    durationPreview: document.querySelector("[data-duration-preview]"),
    notesCount: document.querySelector("[data-notes-count]"),
    formMessage: document.querySelector("[data-form-message]"),
    saveEventLabel: document.querySelector("[data-save-event-label]"),
    eventPreview: document.querySelector("[data-event-preview]"),
    readinessBadge: document.querySelector("[data-readiness-badge]"),
    readinessList: document.querySelector("[data-readiness-list]"),
    jsonPreview: document.querySelector("[data-json-preview]"),
    importInput: document.querySelector("[data-import-input]"),
    deleteDialog: document.querySelector("[data-delete-dialog]"),
    deleteCopy: document.querySelector("[data-delete-copy]"),
    toast: document.querySelector("[data-dashboard-toast]")
  };

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfCurrentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const state = {
    schedule: structuredClone(DEFAULT_SCHEDULE),
    published: structuredClone(DEFAULT_SCHEDULE),
    activeView: "overview",
    overviewMonth: startOfCurrentMonth,
    scheduleMonth: startOfCurrentMonth,
    dateFilter: "",
    search: "",
    statusFilter: "all",
    formDirty: false,
    pendingDeleteId: "",
    draftRecovered: false,
    loadError: false
  };

  const monthFormatter = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });
  const monthOnlyFormatter = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "UTC"
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const dateKey = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

  const dateFromKey = (key) => {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const addDays = (date, amount) => {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
  };

  const addMonths = (date, amount) => new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + amount,
    1
  ));

  const sameMonth = (one, two) => (
    one.getUTCFullYear() === two.getUTCFullYear()
    && one.getUTCMonth() === two.getUTCMonth()
  );

  const slugify = (value) => String(value || "chain")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "chain";

  const safeUrl = (value) => {
    const input = String(value || "").trim();
    if (!input) return "";
    try {
      const url = new URL(input);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const normaliseEvent = (event, index = 0) => {
    if (!event || typeof event !== "object") return null;
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (!String(event.title || "").trim() || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

    const status = Object.prototype.hasOwnProperty.call(STATUS_LABELS, event.status)
      ? event.status
      : "planning";

    return {
      id: String(event.id || `${slugify(event.title)}-${dateKey(start)}-${index + 1}`),
      title: String(event.title).trim().slice(0, 80),
      start: start.toISOString(),
      end: end.toISOString(),
      status,
      target: String(event.target || "To be announced").trim().slice(0, 100),
      lead: String(event.lead || "Council").trim().slice(0, 80),
      rallyPoint: String(event.rallyPoint || "Faction chat and Discord").trim().slice(0, 120),
      notes: String(event.notes || "Watch faction channels for the final operational brief.").trim().slice(0, 500),
      expectations: Array.isArray(event.expectations)
        ? event.expectations.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
        : [],
      briefingUrl: safeUrl(event.briefingUrl)
    };
  };

  const normaliseSchedule = (payload, { strict = false } = {}) => {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.events)) {
      throw new Error("The selected file is not a valid chain schedule.");
    }

    const events = payload.events.map(normaliseEvent);
    if (strict && events.some((event) => !event)) {
      throw new Error("One or more events has an invalid title, start time or end time.");
    }

    return {
      schemaVersion: 1,
      timeZone: "UTC",
      timeZoneLabel: String(payload.timeZoneLabel || "TCT"),
      updatedAt: Number.isNaN(new Date(payload.updatedAt).getTime()) ? "" : new Date(payload.updatedAt).toISOString(),
      events: events.filter(Boolean).sort((one, two) => new Date(one.start) - new Date(two.start))
    };
  };

  const comparableEvents = (schedule) => JSON.stringify(
    schedule.events.map((event) => ({ ...event })).sort((one, two) => one.id.localeCompare(two.id))
  );

  const hasLocalChanges = () => comparableEvents(state.schedule) !== comparableEvents(state.published);

  const eventOccursOn = (event, date) => {
    const dayStart = date.getTime();
    const dayEnd = addDays(date, 1).getTime();
    return new Date(event.start).getTime() < dayEnd && new Date(event.end).getTime() > dayStart;
  };

  const eventsForDate = (date) => state.schedule.events.filter((event) => eventOccursOn(event, date));

  const upcomingEvents = () => {
    const currentTime = Date.now();
    return state.schedule.events.filter((event) => (
      new Date(event.end).getTime() >= currentTime
      && event.status !== "completed"
      && event.status !== "cancelled"
    ));
  };

  const formatDuration = (event) => {
    const duration = new Date(event.end) - new Date(event.start);
    if (!Number.isFinite(duration) || duration <= 0) return "—";
    const minutes = Math.round(duration / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (remainingMinutes || !parts.length) parts.push(`${remainingMinutes}m`);
    return parts.join(" ");
  };

  const formatTctRange = (event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time not set";
    const sameDay = dateKey(start) === dateKey(end);
    return sameDay
      ? `${timeFormatter.format(start)}–${timeFormatter.format(end)} TCT`
      : `${dayMonthFormatter.format(start)}, ${timeFormatter.format(start)}–${dayMonthFormatter.format(end)}, ${timeFormatter.format(end)} TCT`;
  };

  const statusPill = (status) => (
    `<span class="dashboard-status-pill is-${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status] || "Planning")}</span>`
  );

  const createPayload = () => ({
    schemaVersion: 1,
    timeZone: "UTC",
    timeZoneLabel: "TCT",
    updatedAt: state.schedule.updatedAt || new Date().toISOString(),
    events: state.schedule.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: event.status,
      target: event.target,
      lead: event.lead,
      rallyPoint: event.rallyPoint,
      notes: event.notes,
      expectations: [...event.expectations],
      briefingUrl: event.briefingUrl
    }))
  });

  const jsonOutput = () => `${JSON.stringify(createPayload(), null, 2)}\n`;

  const setSaveState = () => {
    if (!elements.saveState || !elements.saveCopy) return;
    const title = elements.saveState.querySelector("strong");
    const icon = elements.saveState.querySelector("i");
    elements.saveState.classList.toggle("is-unsaved", state.formDirty || hasLocalChanges());

    if (state.formDirty) {
      title.textContent = "Unsaved form";
      elements.saveCopy.textContent = "Save this chain to keep changes";
      icon.className = "fa-solid fa-pen";
      return;
    }

    if (hasLocalChanges()) {
      title.textContent = "Local draft saved";
      elements.saveCopy.textContent = "Publish when council is ready";
      icon.className = "fa-solid fa-cloud";
      return;
    }

    title.textContent = state.loadError ? "Local workspace" : "Published schedule";
    elements.saveCopy.textContent = state.loadError ? "Live data could not be loaded" : "No unpublished changes";
    icon.className = state.loadError ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-check";
  };

  const saveDraft = () => {
    state.schedule.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        savedAt: state.schedule.updatedAt,
        schedule: createPayload()
      }));
    } catch {
      showToast("Draft not stored", "This browser blocked local storage.", "warning");
    }
    setSaveState();
  };

  let toastTimer = 0;
  const showToast = (title, copy, type = "success") => {
    if (!elements.toast) return;
    window.clearTimeout(toastTimer);
    const icon = elements.toast.querySelector("i");
    elements.toast.querySelector("strong").textContent = title;
    elements.toast.querySelector("small").textContent = copy;
    icon.className = type === "warning" ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-check";
    elements.toast.hidden = false;
    window.requestAnimationFrame(() => elements.toast.classList.add("is-visible"));
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
      window.setTimeout(() => { elements.toast.hidden = true; }, 220);
    }, 3200);
  };

  const closeSidebar = () => {
    document.body.classList.remove("dashboard-sidebar-open");
    elements.sidebarOpen?.setAttribute("aria-expanded", "false");
    if (elements.sidebarClose) elements.sidebarClose.hidden = true;
  };

  const openSidebar = () => {
    document.body.classList.add("dashboard-sidebar-open");
    elements.sidebarOpen?.setAttribute("aria-expanded", "true");
    if (elements.sidebarClose) elements.sidebarClose.hidden = false;
  };

  const switchView = (view, { updateHash = true } = {}) => {
    if (!VIEW_META[view]) return;
    state.activeView = view;
    viewPanels.forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    elements.sidebar?.querySelectorAll("[data-dashboard-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.dashboardView === view);
    });
    elements.viewLabel.textContent = VIEW_META[view].label;
    elements.viewTitle.textContent = VIEW_META[view].title;
    if (updateHash) history.replaceState(null, "", `#${view}`);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "auto" });
    if (view === "publish") renderPublish();
  };

  const renderMetrics = () => {
    const upcoming = upcomingEvents();
    const confirmed = upcoming.filter((event) => event.status === "confirmed");
    const planning = upcoming.filter((event) => event.status === "planning");
    const next = upcoming[0];
    elements.metricUpcoming.textContent = String(upcoming.length);
    elements.metricConfirmed.textContent = String(confirmed.length);
    elements.metricPlanning.textContent = String(planning.length);
    elements.metricUpcomingCopy.textContent = upcoming.length === 1 ? "1 active window" : upcoming.length ? `${upcoming.length} active windows` : "No windows published";
    elements.metricNext.textContent = next ? dayMonthFormatter.format(new Date(next.start)) : "—";
    elements.metricNextCopy.textContent = next ? formatTctRange(next) : "Awaiting schedule";
    elements.sidebarEventCount.textContent = String(state.schedule.events.length);
  };

  const renderOverviewNext = () => {
    const next = upcomingEvents()[0];
    if (!next) {
      elements.nextStatus.textContent = "Schedule clear";
      elements.overviewNext.innerHTML = `
        <div class="dashboard-empty-workspace">
          <span><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i></span>
          <strong>No upcoming chain</strong>
          <p>Create the first window to begin building the member calendar.</p>
          <button class="dashboard-primary-button" type="button" data-new-event><i class="fa-solid fa-plus" aria-hidden="true"></i> Schedule a chain</button>
        </div>`;
      return;
    }

    elements.nextStatus.innerHTML = statusPill(next.status);
    elements.overviewNext.innerHTML = `
      <div class="dashboard-next-content">
        <div>
          <span class="dashboard-next-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(fullDateFormatter.format(new Date(next.start)))} · ${escapeHtml(formatTctRange(next))}</span>
          <h4>${escapeHtml(next.title)}</h4>
          <p>${escapeHtml(next.notes)}</p>
          <dl class="dashboard-next-meta">
            <div><dt>Target</dt><dd>${escapeHtml(next.target)}</dd></div>
            <div><dt>Chain lead</dt><dd>${escapeHtml(next.lead)}</dd></div>
            <div><dt>Duration</dt><dd>${escapeHtml(formatDuration(next))}</dd></div>
          </dl>
        </div>
        <button class="dashboard-secondary-button" type="button" data-event-action="edit" data-event-id="${escapeHtml(next.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit chain</button>
      </div>`;
  };

  const renderOverviewQueue = () => {
    const events = upcomingEvents().slice(0, 4);
    if (!events.length) {
      elements.overviewQueue.innerHTML = `
        <div class="dashboard-list-empty"><i class="fa-solid fa-list-check" aria-hidden="true"></i><strong>The queue is empty</strong><p>Upcoming chains will appear here after they are saved.</p></div>`;
      return;
    }

    elements.overviewQueue.innerHTML = events.map((event) => {
      const date = new Date(event.start);
      return `
        <button class="dashboard-queue-item" type="button" data-event-action="edit" data-event-id="${escapeHtml(event.id)}">
          <span class="dashboard-queue-date"><strong>${date.getUTCDate()}</strong><small>${escapeHtml(monthOnlyFormatter.format(date))}</small></span>
          <span class="dashboard-queue-copy"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(formatTctRange(event))} · ${escapeHtml(STATUS_LABELS[event.status])}</span></span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>`;
    }).join("");
  };

  const renderCalendar = (container, visibleMonth, { mode, selectedDate = "" }) => {
    if (!container) return;
    const first = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1));
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const gridStart = addDays(first, -mondayOffset);
    const todayKey = dateKey(today);
    const fragment = document.createDocumentFragment();

    WEEKDAYS.forEach((weekday) => {
      const heading = document.createElement("span");
      heading.className = "dashboard-calendar-weekday";
      heading.textContent = weekday;
      fragment.appendChild(heading);
    });

    for (let index = 0; index < 42; index += 1) {
      const date = addDays(gridStart, index);
      const key = dateKey(date);
      const events = eventsForDate(date);
      const day = document.createElement("button");
      day.type = "button";
      day.className = "dashboard-calendar-day";
      day.dataset[mode === "overview" ? "overviewDate" : "scheduleDate"] = key;
      if (!sameMonth(date, first)) day.classList.add("is-outside");
      if (key === todayKey) day.classList.add("is-today");
      if (key === selectedDate) day.classList.add("is-selected");
      day.setAttribute("aria-label", `${fullDateFormatter.format(date)}. ${events.length ? `${events.length} scheduled chain${events.length === 1 ? "" : "s"}` : "No chain scheduled"}.`);
      day.innerHTML = `
        <span class="dashboard-calendar-number">${date.getUTCDate()}</span>
        <span class="dashboard-calendar-event-name">${escapeHtml(events[0]?.title || "")}</span>
        <span class="dashboard-calendar-markers" aria-hidden="true">${events.slice(0, 3).map((event) => `<i class="is-${escapeHtml(event.status)}"></i>`).join("")}</span>`;
      fragment.appendChild(day);
    }

    container.replaceChildren(fragment);
  };

  const renderCalendars = () => {
    elements.overviewMonth.textContent = monthFormatter.format(state.overviewMonth);
    elements.scheduleMonth.textContent = monthFormatter.format(state.scheduleMonth);
    renderCalendar(elements.overviewCalendar, state.overviewMonth, { mode: "overview" });
    renderCalendar(elements.scheduleCalendar, state.scheduleMonth, { mode: "schedule", selectedDate: state.dateFilter });
  };

  const filteredEvents = () => state.schedule.events.filter((event) => {
    const matchesStatus = state.statusFilter === "all" || event.status === state.statusFilter;
    const haystack = [event.title, event.target, event.lead, event.notes].join(" ").toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search);
    const matchesDate = !state.dateFilter || eventOccursOn(event, dateFromKey(state.dateFilter));
    return matchesStatus && matchesSearch && matchesDate;
  });

  const renderEventList = () => {
    const events = filteredEvents();
    elements.clearDateFilter.hidden = !state.dateFilter;
    elements.eventListTitle.textContent = state.dateFilter
      ? `Chains on ${dayMonthFormatter.format(dateFromKey(state.dateFilter))}`
      : "All chains";

    if (!events.length) {
      elements.eventList.innerHTML = `
        <div class="dashboard-list-empty"><i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i><strong>No matching chains</strong><p>Adjust the filters or create a new event.</p></div>`;
      return;
    }

    elements.eventList.innerHTML = events.map((event) => `
      <article class="dashboard-event-card">
        <div class="dashboard-event-card-top">${statusPill(event.status)}<span class="dashboard-event-card-time">${escapeHtml(shortDateFormatter.format(new Date(event.start)))}</span></div>
        <h4>${escapeHtml(event.title)}</h4>
        <p>${escapeHtml(formatTctRange(event))} · ${escapeHtml(event.target)}</p>
        <div class="dashboard-event-card-actions">
          <button type="button" data-event-action="edit" data-event-id="${escapeHtml(event.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button>
          <button type="button" data-event-action="duplicate" data-event-id="${escapeHtml(event.id)}"><i class="fa-regular fa-copy" aria-hidden="true"></i> Duplicate</button>
          <button type="button" data-event-action="delete" data-event-id="${escapeHtml(event.id)}" aria-label="Delete ${escapeHtml(event.title)}"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>
        </div>
      </article>`).join("");
  };

  const field = (name) => form.elements.namedItem(name);

  const setDefaultForm = () => {
    const base = new Date();
    base.setUTCMinutes(0, 0, 0);
    base.setUTCHours(base.getUTCHours() + 1);
    const end = new Date(base.getTime() + (2 * 60 * 60 * 1000));
    form.reset();
    elements.eventId.value = "";
    field("status").value = "planning";
    field("startDate").value = dateKey(base);
    field("startTime").value = base.toISOString().slice(11, 16);
    field("endDate").value = dateKey(end);
    field("endTime").value = end.toISOString().slice(11, 16);
    field("rallyPoint").value = "Faction chat and Discord";
    elements.editorHeading.textContent = "Create a chain window.";
    elements.saveEventLabel.textContent = "Save chain";
    elements.formMessage.textContent = "";
    state.formDirty = false;
    updateFormMeta();
    renderEventPreview();
    setSaveState();
  };

  const fillForm = (event, { duplicate = false } = {}) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    form.reset();
    elements.eventId.value = duplicate ? "" : event.id;
    field("title").value = duplicate ? `${event.title} copy` : event.title;
    field("status").value = duplicate ? "planning" : event.status;
    field("startDate").value = dateKey(start);
    field("startTime").value = start.toISOString().slice(11, 16);
    field("endDate").value = dateKey(end);
    field("endTime").value = end.toISOString().slice(11, 16);
    field("target").value = event.target;
    field("lead").value = event.lead;
    field("rallyPoint").value = event.rallyPoint;
    field("briefingUrl").value = event.briefingUrl;
    field("notes").value = event.notes;
    field("expectations").value = event.expectations.join("\n");
    elements.editorHeading.textContent = duplicate ? "Duplicate chain window." : `Edit ${event.title}.`;
    elements.saveEventLabel.textContent = duplicate ? "Save duplicate" : "Update chain";
    elements.formMessage.textContent = "";
    state.formDirty = duplicate;
    updateFormMeta();
    renderEventPreview();
    switchView("editor");
    setSaveState();
  };

  const formDates = () => {
    const startValue = field("startDate").value && field("startTime").value
      ? `${field("startDate").value}T${field("startTime").value}:00Z`
      : "";
    const endValue = field("endDate").value && field("endTime").value
      ? `${field("endDate").value}T${field("endTime").value}:00Z`
      : "";
    return { start: new Date(startValue), end: new Date(endValue) };
  };

  const updateFormMeta = () => {
    const { start, end } = formDates();
    const tempEvent = { start, end };
    elements.durationPreview.textContent = formatDuration(tempEvent);
    elements.notesCount.textContent = String(field("notes").value.length);
  };

  const previewEventFromForm = () => {
    const { start, end } = formDates();
    const title = field("title").value.trim();
    if (!title && Number.isNaN(start.getTime())) return null;
    const previewStart = Number.isNaN(start.getTime()) ? new Date() : start;
    const previewEnd = Number.isNaN(end.getTime()) || end <= previewStart
      ? new Date(previewStart.getTime() + 3600000)
      : end;
    return {
      title: title || "Untitled chain window",
      start: previewStart.toISOString(),
      end: previewEnd.toISOString(),
      status: field("status").value || "planning",
      target: field("target").value.trim() || "To be announced",
      lead: field("lead").value.trim() || "Council",
      rallyPoint: field("rallyPoint").value.trim() || "Faction chat and Discord",
      notes: field("notes").value.trim() || "Add an operational note to complete the member briefing.",
      expectations: field("expectations").value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8)
    };
  };

  const renderEventPreview = () => {
    const event = previewEventFromForm();
    if (!event) {
      elements.eventPreview.innerHTML = `
        <div class="dashboard-preview-empty"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><strong>Your preview will appear here</strong><p>Start with a title and schedule to see the member-facing event card.</p></div>`;
      return;
    }

    elements.eventPreview.innerHTML = `
      <div class="dashboard-preview-content">
        <div class="dashboard-event-card-top">${statusPill(event.status)}<span class="dashboard-event-card-time">${escapeHtml(formatDuration(event))}</span></div>
        <span class="dashboard-preview-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(fullDateFormatter.format(new Date(event.start)))}</span>
        <h4>${escapeHtml(event.title)}</h4>
        <p>${escapeHtml(event.notes)}</p>
        <dl class="dashboard-preview-meta">
          <div><dt>Window</dt><dd>${escapeHtml(formatTctRange(event))}</dd></div>
          <div><dt>Target</dt><dd>${escapeHtml(event.target)}</dd></div>
          <div><dt>Chain lead</dt><dd>${escapeHtml(event.lead)}</dd></div>
          <div><dt>Live channel</dt><dd>${escapeHtml(event.rallyPoint)}</dd></div>
        </dl>
        ${event.expectations.length ? `<ul class="dashboard-preview-checklist">${event.expectations.map((item) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${escapeHtml(item)}</span></li>`).join("")}</ul>` : ""}
      </div>`;
  };

  const markInvalid = (control) => {
    control.closest(".dashboard-field")?.classList.add("is-invalid");
  };

  const clearInvalid = () => form.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));

  const readFormEvent = () => {
    clearInvalid();
    const title = field("title").value.trim();
    const { start, end } = formDates();
    const briefingInput = field("briefingUrl").value.trim();

    if (!title) {
      markInvalid(field("title"));
      throw new Error("Add a chain title before saving.");
    }
    if (Number.isNaN(start.getTime())) {
      markInvalid(field("startDate"));
      markInvalid(field("startTime"));
      throw new Error("Choose a valid start date and TCT time.");
    }
    if (Number.isNaN(end.getTime())) {
      markInvalid(field("endDate"));
      markInvalid(field("endTime"));
      throw new Error("Choose a valid end date and TCT time.");
    }
    if (end <= start) {
      markInvalid(field("endDate"));
      markInvalid(field("endTime"));
      throw new Error("The end of the chain must be after its start.");
    }
    if (briefingInput && !safeUrl(briefingInput)) {
      markInvalid(field("briefingUrl"));
      throw new Error("The briefing link must begin with http:// or https://.");
    }

    const expectations = field("expectations").value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    const existingId = elements.eventId.value;
    const baseId = `${slugify(title)}-${dateKey(start)}`;
    let id = existingId || baseId;
    let suffix = 2;
    while (!existingId && state.schedule.events.some((event) => event.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return {
      id,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      status: field("status").value,
      target: field("target").value.trim() || "To be announced",
      lead: field("lead").value.trim() || "Council",
      rallyPoint: field("rallyPoint").value.trim() || "Faction chat and Discord",
      notes: field("notes").value.trim() || "Watch faction channels for the final operational brief.",
      expectations,
      briefingUrl: safeUrl(briefingInput)
    };
  };

  const saveEvent = ({ addAnother = false } = {}) => {
    try {
      const event = readFormEvent();
      const existingIndex = state.schedule.events.findIndex((item) => item.id === event.id);
      if (existingIndex >= 0) state.schedule.events[existingIndex] = event;
      else state.schedule.events.push(event);
      state.schedule.events.sort((one, two) => new Date(one.start) - new Date(two.start));
      elements.eventId.value = event.id;
      state.formDirty = false;
      saveDraft();
      renderAll();
      showToast(existingIndex >= 0 ? "Chain updated" : "Chain scheduled", `${event.title} is saved in the local draft.`);
      if (addAnother) setDefaultForm();
      else fillForm(event);
      return true;
    } catch (error) {
      elements.formMessage.textContent = error.message;
      return false;
    }
  };

  const editEvent = (id, { duplicate = false } = {}) => {
    const event = state.schedule.events.find((item) => item.id === id);
    if (event) fillForm(event, { duplicate });
  };

  const requestDeleteEvent = (id) => {
    const event = state.schedule.events.find((item) => item.id === id);
    if (!event || !elements.deleteDialog) return;
    state.pendingDeleteId = id;
    elements.deleteCopy.textContent = `${event.title} will be removed from this local workspace. The published calendar will not change until you publish.`;
    elements.deleteDialog.returnValue = "";
    elements.deleteDialog.showModal();
  };

  const removePendingEvent = () => {
    const event = state.schedule.events.find((item) => item.id === state.pendingDeleteId);
    if (!event) return;
    state.schedule.events = state.schedule.events.filter((item) => item.id !== state.pendingDeleteId);
    if (elements.eventId.value === state.pendingDeleteId) setDefaultForm();
    state.pendingDeleteId = "";
    saveDraft();
    renderAll();
    showToast("Chain removed", `${event.title} was removed from the local draft.`);
  };

  const renderReadiness = () => {
    const planningCount = state.schedule.events.filter((event) => event.status === "planning").length;
    const invalidCount = state.schedule.events.filter((event) => !normaliseEvent(event)).length;
    const items = [
      {
        warning: invalidCount > 0,
        icon: invalidCount ? "fa-triangle-exclamation" : "fa-code",
        title: "Schedule structure",
        copy: invalidCount ? `${invalidCount} invalid event${invalidCount === 1 ? "" : "s"} found` : "Valid JSON schema and event dates",
        value: invalidCount ? "Review" : "Passed"
      },
      {
        warning: !state.schedule.events.length,
        icon: "fa-calendar-check",
        title: "Scheduled events",
        copy: state.schedule.events.length ? `${state.schedule.events.length} event${state.schedule.events.length === 1 ? "" : "s"} ready for export` : "The schedule currently contains no events",
        value: String(state.schedule.events.length)
      },
      {
        warning: planningCount > 0,
        icon: "fa-compass-drafting",
        title: "Council confirmation",
        copy: planningCount ? `${planningCount} provisional event${planningCount === 1 ? "" : "s"} remain clearly marked` : "No planning statuses remain",
        value: planningCount ? "Check" : "Clear"
      },
      {
        warning: hasLocalChanges(),
        icon: "fa-cloud-arrow-up",
        title: "Published version",
        copy: hasLocalChanges() ? "Local changes have not been published" : "Workspace matches the loaded schedule",
        value: hasLocalChanges() ? "Draft" : "Synced"
      }
    ];

    elements.readinessBadge.textContent = invalidCount ? "Needs attention" : state.schedule.events.length ? "Valid output" : "Empty schedule";
    elements.readinessList.innerHTML = items.map((item) => `
      <div class="dashboard-readiness-item${item.warning ? " is-warning" : ""}">
        <i class="fa-solid ${item.icon}" aria-hidden="true"></i>
        <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span></div>
        <small>${escapeHtml(item.value)}</small>
      </div>`).join("");
  };

  const renderPublish = () => {
    renderReadiness();
    elements.jsonPreview.textContent = jsonOutput();
  };

  const renderAll = () => {
    renderMetrics();
    renderOverviewNext();
    renderOverviewQueue();
    renderCalendars();
    renderEventList();
    renderPublish();
    setSaveState();
  };

  const copyJson = async () => {
    const output = jsonOutput();
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = output;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast("JSON copied", "Paste it over data/chain-schedule.json in GitHub.");
  };

  const downloadJson = () => {
    const blob = new Blob([jsonOutput()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chain-schedule.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("JSON downloaded", "The validated schedule file is ready to upload.");
  };

  const replaceWorkspace = (schedule, { persist = true } = {}) => {
    state.schedule = structuredClone(schedule);
    state.dateFilter = "";
    state.formDirty = false;
    if (persist) saveDraft();
    setDefaultForm();
    renderAll();
  };

  const fetchPublishedSchedule = async () => {
    const response = await fetch("data/chain-schedule.json", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normaliseSchedule(await response.json(), { strict: true });
  };

  const refreshPublished = async () => {
    if ((state.formDirty || hasLocalChanges()) && !window.confirm("Replace the current local draft and any unsaved form changes with the published schedule?")) return;
    try {
      const published = await fetchPublishedSchedule();
      state.published = structuredClone(published);
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
      replaceWorkspace(published, { persist: false });
      showToast("Published schedule loaded", "The workspace now matches the live data.");
    } catch {
      showToast("Reload failed", "The published schedule could not be fetched.", "warning");
    }
  };

  const resetDraft = () => {
    if (!window.confirm("Discard every local schedule change and any unsaved form changes, then restore the published version?")) return;
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    replaceWorkspace(state.published, { persist: false });
    showToast("Draft discarded", "The published schedule has been restored.");
  };

  const importFile = async (file) => {
    if (!file) return;
    try {
      const schedule = normaliseSchedule(JSON.parse(await file.text()), { strict: true });
      replaceWorkspace(schedule);
      showToast("Schedule imported", `${schedule.events.length} event${schedule.events.length === 1 ? "" : "s"} loaded into the local draft.`);
    } catch (error) {
      showToast("Import failed", error.message || "Choose a valid schedule JSON file.", "warning");
    } finally {
      elements.importInput.value = "";
    }
  };

  const handleEventAction = (target) => {
    const actionButton = target.closest("[data-event-action]");
    if (!actionButton) return false;
    const { eventAction: action, eventId: id } = actionButton.dataset;
    if (action === "edit") editEvent(id);
    if (action === "duplicate") editEvent(id, { duplicate: true });
    if (action === "delete") requestDeleteEvent(id);
    return true;
  };

  document.addEventListener("click", (event) => {
    if (handleEventAction(event.target)) return;

    const viewButton = event.target.closest("[data-dashboard-view]");
    if (viewButton) {
      switchView(viewButton.dataset.dashboardView);
      return;
    }

    if (event.target.closest("[data-new-event]")) {
      setDefaultForm();
      switchView("editor");
    }
  });

  elements.sidebarOpen?.addEventListener("click", openSidebar);
  elements.sidebarClose?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("dashboard-sidebar-open")) closeSidebar();
  });

  form.addEventListener("input", () => {
    state.formDirty = true;
    elements.formMessage.textContent = "";
    updateFormMeta();
    renderEventPreview();
    setSaveState();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEvent();
  });

  document.querySelector("[data-save-and-new]")?.addEventListener("click", () => saveEvent({ addAnother: true }));
  document.querySelector("[data-clear-editor]")?.addEventListener("click", () => {
    if (!state.formDirty || window.confirm("Clear the unsaved form changes?")) setDefaultForm();
  });

  elements.deleteDialog?.addEventListener("close", () => {
    if (elements.deleteDialog.returnValue === "confirm") removePendingEvent();
    else state.pendingDeleteId = "";
  });

  elements.eventSearch?.addEventListener("input", () => {
    state.search = elements.eventSearch.value.trim().toLowerCase();
    renderEventList();
  });
  elements.eventStatusFilter?.addEventListener("change", () => {
    state.statusFilter = elements.eventStatusFilter.value;
    renderEventList();
  });
  elements.clearDateFilter?.addEventListener("click", () => {
    state.dateFilter = "";
    renderCalendars();
    renderEventList();
  });

  elements.overviewCalendar?.addEventListener("click", (event) => {
    const day = event.target.closest("[data-overview-date]");
    if (!day) return;
    state.dateFilter = day.dataset.overviewDate;
    state.scheduleMonth = new Date(Date.UTC(dateFromKey(state.dateFilter).getUTCFullYear(), dateFromKey(state.dateFilter).getUTCMonth(), 1));
    renderCalendars();
    renderEventList();
    switchView("schedule");
  });

  elements.scheduleCalendar?.addEventListener("click", (event) => {
    const day = event.target.closest("[data-schedule-date]");
    if (!day) return;
    state.dateFilter = state.dateFilter === day.dataset.scheduleDate ? "" : day.dataset.scheduleDate;
    renderCalendars();
    renderEventList();
  });

  document.querySelector("[data-overview-previous]")?.addEventListener("click", () => {
    state.overviewMonth = addMonths(state.overviewMonth, -1);
    renderCalendars();
  });
  document.querySelector("[data-overview-calendar-next]")?.addEventListener("click", () => {
    state.overviewMonth = addMonths(state.overviewMonth, 1);
    renderCalendars();
  });
  document.querySelector("[data-overview-today]")?.addEventListener("click", () => {
    state.overviewMonth = startOfCurrentMonth;
    renderCalendars();
  });
  document.querySelector("[data-schedule-previous]")?.addEventListener("click", () => {
    state.scheduleMonth = addMonths(state.scheduleMonth, -1);
    renderCalendars();
  });
  document.querySelector("[data-schedule-next]")?.addEventListener("click", () => {
    state.scheduleMonth = addMonths(state.scheduleMonth, 1);
    renderCalendars();
  });
  document.querySelector("[data-schedule-today]")?.addEventListener("click", () => {
    state.scheduleMonth = startOfCurrentMonth;
    state.dateFilter = dateKey(today);
    renderCalendars();
    renderEventList();
  });

  document.querySelector("[data-copy-json]")?.addEventListener("click", copyJson);
  document.querySelector("[data-download-json]")?.addEventListener("click", downloadJson);
  document.querySelector("[data-copy-and-open]")?.addEventListener("click", () => {
    const githubWindow = window.open(GITHUB_EDIT_URL, "_blank");
    if (githubWindow) githubWindow.opener = null;
    copyJson();
    if (!githubWindow) showToast("JSON copied", "Allow pop-ups, then open the GitHub schedule file manually.", "warning");
  });
  document.querySelector("[data-import-json]")?.addEventListener("click", () => elements.importInput?.click());
  elements.importInput?.addEventListener("change", () => importFile(elements.importInput.files?.[0]));
  document.querySelector("[data-refresh-published]")?.addEventListener("click", refreshPublished);
  document.querySelector("[data-reset-draft]")?.addEventListener("click", resetDraft);

  window.addEventListener("beforeunload", (event) => {
    if (!state.formDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const initialise = async () => {
    try {
      state.published = await fetchPublishedSchedule();
      state.schedule = structuredClone(state.published);
    } catch {
      state.loadError = true;
      state.published = structuredClone(DEFAULT_SCHEDULE);
      state.schedule = structuredClone(DEFAULT_SCHEDULE);
    }

    try {
      const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
      if (stored?.schedule) {
        state.schedule = normaliseSchedule(stored.schedule, { strict: true });
        state.draftRecovered = true;
      }
    } catch {
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    }

    setDefaultForm();
    renderAll();
    const requestedView = location.hash.slice(1);
    switchView(VIEW_META[requestedView] ? requestedView : "overview", { updateHash: false });
    if (state.draftRecovered) showToast("Local draft restored", "Your previous dashboard changes are ready to continue.");
    if (state.loadError) showToast("Published data unavailable", "The dashboard opened with an empty local schedule.", "warning");
  };

  initialise();
})();
