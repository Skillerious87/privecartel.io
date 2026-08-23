/*
 * Chain events are published in /data/chain-schedule.json.
 * Event fields: id, title, start, end, status, target, lead,
 * rallyPoint, notes, expectations[] and briefingUrl.
 * Start and end should be ISO 8601 UTC values, for example:
 * 2026-09-05T18:00:00Z
 */

(() => {
  "use strict";

  const calendarBody = document.querySelector("[data-calendar-body]");
  const calendarMonth = document.getElementById("calendarMonth");
  const calendarCaption = document.getElementById("calendarCaption");
  const dateDetail = document.querySelector("[data-date-detail]");
  const upcomingList = document.querySelector("[data-upcoming-list]");
  const scheduleStatus = document.querySelector("[data-schedule-status]");
  const scheduleRetry = document.querySelector("[data-schedule-retry]");
  const calendarSection = document.querySelector(".chain-calendar-section");

  if (!calendarBody || !calendarMonth || !dateDetail || !upcomingList) return;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const ZONE_KEY = "pcChainScheduleZone";
  const VIEW_KEY = "pcChainScheduleView";
  const PREPARATION_KEY = "pcChainSchedulePreparationV1";
  const REFRESH_INTERVAL = 5 * 60 * 1000;

  const DEFAULT_SCHEDULE = {
    timeZone: "UTC",
    timeZoneLabel: "TCT",
    updatedAt: "",
    events: []
  };

  const STATUS_LABELS = {
    confirmed: "Confirmed",
    planning: "Planning",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const viewerIsUtc = /^(UTC|Etc\/UTC|Etc\/GMT|GMT)$/.test(localTimeZone);

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const readStorage = (key) => {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  };
  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  };

  const readPreparation = () => {
    try {
      const stored = JSON.parse(readStorage(PREPARATION_KEY) || "{}");
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
      return Object.fromEntries(Object.entries(stored).map(([eventId, items]) => [
        eventId,
        Array.isArray(items) ? items.map(String).filter(Boolean).slice(0, 12) : []
      ]));
    } catch {
      return {};
    }
  };

  const state = {
    schedule: DEFAULT_SCHEDULE,
    events: [],
    today,
    selectedDate: today,
    visibleMonth: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    /* Members are spread across timezones; TCT stays the default. */
    zone: readStorage(ZONE_KEY) === "local" && !viewerIsUtc ? "local" : "tct",
    view: readStorage(VIEW_KEY) === "agenda" ? "agenda" : "calendar",
    showPast: false,
    loadError: false,
    refreshError: false,
    isLoading: true,
    hasLoaded: false,
    preparation: readPreparation()
  };

  /* ── Time formatting ────────────────────────────────────────
     Every formatter follows the viewer's chosen zone so one
     toggle re-labels the whole page.                          */

  const activeZone = () => (state.zone === "local" ? localTimeZone : "UTC");

  const abbreviationIn = (date, timeZone) => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
        .formatToParts(date);
      return parts.find((part) => part.type === "timeZoneName")?.value || "local";
    } catch {
      return "local";
    }
  };

  const localAbbreviation = abbreviationIn(new Date(), localTimeZone);

  const zoneLabel = (date = new Date()) => (
    state.zone === "local" ? abbreviationIn(date, localTimeZone) : state.schedule.timeZoneLabel || "TCT"
  );
  const otherZoneLabel = (date = new Date()) => (
    state.zone === "local" ? state.schedule.timeZoneLabel || "TCT" : abbreviationIn(date, localTimeZone)
  );

  const formatterCache = new Map();
  const formatter = (options) => {
    const zone = activeZone();
    const key = `${zone}:${JSON.stringify(options)}`;
    if (!formatterCache.has(key)) {
      formatterCache.set(key, new Intl.DateTimeFormat("en-GB", { ...options, timeZone: zone }));
    }
    return formatterCache.get(key);
  };

  /* Calendar structure is always reckoned in TCT so every member
     sees the same grid, whatever their own clock says. */
  const utcFormatter = (options) => {
    const key = `UTC-fixed:${JSON.stringify(options)}`;
    if (!formatterCache.has(key)) {
      formatterCache.set(key, new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }));
    }
    return formatterCache.get(key);
  };

  const monthFormatter = utcFormatter({ month: "long", year: "numeric" });
  const fullDateFormatter = utcFormatter({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const shortDateFormatter = utcFormatter({ weekday: "short", day: "numeric", month: "short" });
  const dayMonthFormatter = utcFormatter({ day: "numeric", month: "short" });
  const monthYearFormatter = utcFormatter({ month: "long", year: "numeric" });

  const timeIn = (date) => formatter({ hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const dateTimeIn = (date) => formatter({
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
  const updatedFormatter = utcFormatter({
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
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

  const addMonths = (date, amount) => {
    const targetMonth = date.getUTCMonth() + amount;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
  };

  const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  const isSameMonth = (one, two) => (
    one.getUTCFullYear() === two.getUTCFullYear() && one.getUTCMonth() === two.getUTCMonth()
  );

  const safeUrl = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const normaliseSchedule = (payload) => {
    const source = payload && typeof payload === "object" ? payload : DEFAULT_SCHEDULE;
    const events = Array.isArray(source.events) ? source.events : [];

    return {
      timeZone: "UTC",
      timeZoneLabel: String(source.timeZoneLabel || "TCT"),
      updatedAt: String(source.updatedAt || ""),
      events: events.map((event, index) => {
        const start = new Date(event?.start);
        const end = new Date(event?.end);
        if (!event?.title || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

        const status = Object.prototype.hasOwnProperty.call(STATUS_LABELS, event.status) ? event.status : "planning";
        return {
          id: String(event.id || `chain-${start.toISOString()}-${index}`),
          title: String(event.title),
          start,
          end,
          status,
          target: String(event.target || "To be announced"),
          lead: String(event.lead || "Council"),
          rallyPoint: String(event.rallyPoint || "Faction chat and Discord"),
          notes: String(event.notes || "Watch faction channels for the final operational brief."),
          expectations: Array.isArray(event.expectations)
            ? event.expectations.map(String).filter(Boolean).slice(0, 8)
            : [],
          briefingUrl: safeUrl(event.briefingUrl),
          date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
        };
      }).filter(Boolean).sort((one, two) => one.start - two.start)
    };
  };

  /* ── Event queries ─────────────────────────────────────────── */

  const eventsForDate = (date) => {
    const dayStart = date.getTime();
    const dayEnd = addDays(date, 1).getTime();
    return state.events.filter((event) => (
      event.start.getTime() < dayEnd && event.end.getTime() > dayStart
    ));
  };

  const isLive = (event) => {
    const current = Date.now();
    return event.start.getTime() <= current
      && event.end.getTime() > current
      && event.status !== "cancelled";
  };

  const liveEvents = () => state.events.filter(isLive);

  const activeUpcomingEvents = () => {
    const currentTime = Date.now();
    return state.events.filter((event) => (
      event.end.getTime() >= currentTime
      && event.status !== "completed"
      && event.status !== "cancelled"
    ));
  };

  const pastEvents = () => state.events
    .filter((event) => event.end.getTime() < Date.now() || event.status === "completed" || event.status === "cancelled")
    .sort((one, two) => two.start - one.start);

  /* ── Presentation helpers ──────────────────────────────────── */

  const formatRange = (event) => `${timeIn(event.start)}–${timeIn(event.end)} ${zoneLabel(event.start)}`;

  /*
   * The zone the viewer is not currently reading, for the second line.
   * A window that starts and ends on the same day there only needs the
   * date once, but one that crosses midnight has to show both.
   */
  const formatAlternateRange = (event) => {
    if (viewerIsUtc) return "";
    const zone = state.zone === "local" ? "UTC" : localTimeZone;
    const dayPart = new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", timeZone: zone
    });
    const timePart = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone
    });

    const startDay = dayPart.format(event.start);
    const endDay = dayPart.format(event.end);
    const label = otherZoneLabel(event.start);

    return startDay === endDay
      ? `${startDay}, ${timePart.format(event.start)}–${timePart.format(event.end)} ${label}`
      : `${startDay} ${timePart.format(event.start)} – ${endDay} ${timePart.format(event.end)} ${label}`;
  };

  const formatDuration = (event) => {
    const minutes = Math.max(1, Math.round((event.end - event.start) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${minutes} min`;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  };

  const formatUpdated = () => {
    const updated = new Date(state.schedule.updatedAt);
    return Number.isNaN(updated.getTime()) ? "" : `${updatedFormatter.format(updated)} TCT`;
  };

  const statusPill = (status) => (
    `<span class="chain-status-pill is-${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status])}</span>`
  );

  const metaRow = (label, value) => (value
    ? `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    : "");

  /* Breaks a span into whole units so the hero can show real digits. */
  const splitDuration = (milliseconds) => {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
      total
    };
  };

  const compactCountdown = (milliseconds) => {
    const { days, hours, minutes, seconds } = splitDuration(milliseconds);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  /* ── Calendar ──────────────────────────────────────────────── */

  const renderCalendar = () => {
    const first = startOfMonth(state.visibleMonth);
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const gridStart = addDays(first, -mondayOffset);
    const selectedKey = dateKey(state.selectedDate);
    const todayKey = dateKey(state.today);
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const weekCount = Math.ceil((mondayOffset + daysInMonth) / 7);

    calendarMonth.textContent = monthFormatter.format(first);
    if (calendarCaption) calendarCaption.textContent = `${monthFormatter.format(first)} chain schedule`;
    calendarBody.closest("table")?.setAttribute("aria-rowcount", String(weekCount + 1));
    calendarBody.replaceChildren();

    for (let week = 0; week < weekCount; week += 1) {
      const row = document.createElement("tr");

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const day = addDays(gridStart, (week * 7) + dayIndex);
        const key = dateKey(day);
        const dayEvents = eventsForDate(day);
        const cell = document.createElement("td");
        const button = document.createElement("button");
        const classes = ["chain-day"];

        if (!isSameMonth(day, first)) classes.push("is-outside");
        if (key === selectedKey) classes.push("is-selected");
        if (key === todayKey) classes.push("is-today");
        if (dayEvents.length) classes.push("has-event");
        if (dayEvents.some(isLive)) classes.push("is-live");

        button.type = "button";
        button.className = classes.join(" ");
        button.dataset.date = key;
        button.tabIndex = key === selectedKey ? 0 : -1;
        if (key === todayKey) button.setAttribute("aria-current", "date");

        const eventSummary = dayEvents.length
          ? `${dayEvents.length} ${dayEvents.length === 1 ? "chain" : "chains"}: ${dayEvents.map((event) => event.title).join(", ")}`
          : "No chain scheduled";
        button.setAttribute("aria-label", `${fullDateFormatter.format(day)}. ${eventSummary}.`);

        const number = document.createElement("span");
        number.className = "chain-day-number";
        number.textContent = String(day.getUTCDate());
        button.appendChild(number);

        /* Two chips fit legibly; anything beyond becomes a counter. */
        const chips = document.createElement("span");
        chips.className = "chain-day-chips";
        dayEvents.slice(0, 2).forEach((event) => {
          const chip = document.createElement("span");
          chip.className = `chain-day-chip is-${event.status}${isLive(event) ? " is-live" : ""}`;
          chip.innerHTML = `<b>${escapeHtml(timeIn(event.start))}</b><span>${escapeHtml(event.title)}</span>`;
          chips.appendChild(chip);
        });
        if (dayEvents.length > 2) {
          const more = document.createElement("span");
          more.className = "chain-day-more";
          more.textContent = `+${dayEvents.length - 2} more`;
          chips.appendChild(more);
        }
        button.appendChild(chips);

        const markers = document.createElement("span");
        markers.className = "chain-day-markers";
        markers.setAttribute("aria-hidden", "true");
        dayEvents.slice(0, 3).forEach((event) => {
          const marker = document.createElement("i");
          marker.className = `chain-day-marker is-${event.status}`;
          markers.appendChild(marker);
        });
        button.appendChild(markers);

        cell.setAttribute("aria-selected", String(key === selectedKey));
        cell.appendChild(button);
        row.appendChild(cell);
      }

      calendarBody.appendChild(row);
    }
  };

  /* ── Event card ────────────────────────────────────────────── */

  const eventCard = (event, { compact = false } = {}) => {
    const alternate = formatAlternateRange(event);
    const live = isLive(event);
    const preparationOpen = event.end.getTime() >= Date.now()
      && event.status !== "completed"
      && event.status !== "cancelled";
    const completedPreparation = new Set(state.preparation[event.id] || []);
    const completedCount = event.expectations.filter((item) => completedPreparation.has(item)).length;
    const preparationPercent = event.expectations.length
      ? Math.round((completedCount / event.expectations.length) * 100)
      : 0;
    const checklist = !compact && event.expectations.length
      ? preparationOpen
        ? `<div class="chain-preparation${completedCount === event.expectations.length ? " is-complete" : ""}" data-prep-panel="${escapeHtml(event.id)}" role="group" aria-label="Personal preparation">
            <header>
              <div>
                <h5>My preparation</h5>
                <p>Saved on this device</p>
              </div>
              <strong data-prep-count>${completedCount} of ${event.expectations.length} ready</strong>
            </header>
            <div class="chain-preparation-meter" role="progressbar" aria-label="Personal preparation progress" aria-valuemin="0" aria-valuemax="${event.expectations.length}" aria-valuenow="${completedCount}">
              <span style="--chain-preparation-progress: ${preparationPercent}%"></span>
            </div>
            <ul class="chain-event-checklist">${event.expectations.map((item, index) => `
              <li>
                <label>
                  <input type="checkbox" data-prep-check data-event-id="${escapeHtml(event.id)}" data-prep-index="${index}"${completedPreparation.has(item) ? " checked" : ""}>
                  <span class="chain-preparation-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
                  <span>${escapeHtml(item)}</span>
                </label>
              </li>`).join("")}</ul>
          </div>`
        : `<ul class="chain-event-checklist is-static">${event.expectations.map((item) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`
      : "";
    const briefing = event.briefingUrl
      ? `<a href="${escapeHtml(event.briefingUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open briefing</a>`
      : "";

    return `
      <article class="chain-event-card${live ? " is-live" : ""}" data-event-card="${escapeHtml(event.id)}">
        <div class="chain-event-topline">
          ${live ? '<span class="chain-live-pill"><i aria-hidden="true"></i> Live now</span>' : statusPill(event.status)}
          <span class="chain-event-duration">${escapeHtml(formatDuration(event))}</span>
        </div>
        <h4>${escapeHtml(event.title)}</h4>
        <p class="chain-event-primary-time">${escapeHtml(formatRange(event))}</p>
        ${alternate ? `<p class="chain-event-local-time"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${escapeHtml(alternate)}</p>` : ""}
        ${live ? `<p class="chain-event-remaining" data-live-remaining="${escapeHtml(event.id)}"></p>` : ""}
        <dl class="chain-event-meta">
          ${metaRow("Target", event.target)}
          ${metaRow("Chain lead", event.lead)}
          ${metaRow("Live channel", event.rallyPoint)}
        </dl>
        <p class="chain-event-note">${escapeHtml(event.notes)}</p>
        ${checklist}
        <div class="chain-event-actions">
          <button type="button" data-calendar-download="${escapeHtml(event.id)}"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Add to calendar</button>
          <button type="button" data-copy-event="${escapeHtml(event.id)}"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copy details</button>
          ${briefing}
        </div>
      </article>
    `;
  };

  const renderDateDetail = () => {
    if (state.isLoading && !state.events.length) {
      dateDetail.setAttribute("aria-busy", "true");
      dateDetail.innerHTML = `
        <div class="chain-detail-loading">
          <span aria-hidden="true"><i class="fa-solid fa-spinner fa-spin"></i></span>
          <p>Syncing the latest operation windows from council&hellip;</p>
        </div>`;
      return;
    }

    dateDetail.removeAttribute("aria-busy");
    const selectedEvents = eventsForDate(state.selectedDate);
    const updated = formatUpdated();
    const head = `
      <header class="chain-detail-head">
        <span class="chain-detail-date-number" aria-hidden="true">${state.selectedDate.getUTCDate()}</span>
        <div>
          <p>Selected date</p>
          <h3 id="selectedDateTitle">${escapeHtml(fullDateFormatter.format(state.selectedDate))}</h3>
        </div>
      </header>
    `;

    if (!selectedEvents.length) {
      const next = activeUpcomingEvents()[0];
      dateDetail.innerHTML = `${head}
        <div class="chain-detail-empty">
          <span aria-hidden="true"><i class="fa-regular fa-calendar"></i></span>
          <strong>No chain scheduled</strong>
          <p>This date is clear. Select a marked date for the published window, target and preparation details.</p>
          ${next ? `<button type="button" class="chain-detail-jump" data-goto-date="${dateKey(next.date)}">
            Jump to ${escapeHtml(dayMonthFormatter.format(next.start))} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>` : ""}
        </div>
      `;
      return;
    }

    dateDetail.innerHTML = `${head}
      <div class="chain-detail-body">
        ${selectedEvents.map((event) => eventCard(event)).join("")}
        ${updated ? `<p class="chain-detail-updated">Schedule updated ${escapeHtml(updated)}</p>` : ""}
      </div>
    `;
  };

  /* ── Agenda ────────────────────────────────────────────────── */

  const agendaList = $("[data-agenda-list]");

  const renderAgenda = () => {
    if (!agendaList) return;
    if (state.isLoading && !state.events.length) {
      agendaList.innerHTML = `
        <div class="chain-upcoming-empty is-loading" aria-hidden="true">
          <span><i class="fa-solid fa-spinner fa-spin"></i></span>
          <div><strong>Loading the agenda&hellip;</strong><p>Fetching the latest published operations.</p></div>
        </div>`;
      return;
    }
    const source = state.showPast ? [...state.events].reverse() : activeUpcomingEvents();

    if (!source.length) {
      agendaList.innerHTML = `
        <div class="chain-upcoming-empty">
          <span aria-hidden="true"><i class="fa-regular fa-calendar-check"></i></span>
          <div>
            <strong>${state.showPast ? "No operations on record yet." : "No upcoming chain is published."}</strong>
            <p>The calendar is ready for the next council announcement. Members should continue to watch Discord and faction chat for operational updates.</p>
          </div>
        </div>`;
      return;
    }

    /* Grouped by month so a long list still reads as a calendar. */
    const groups = [];
    source.forEach((event) => {
      const label = monthYearFormatter.format(event.start);
      const group = groups.find((item) => item.label === label);
      if (group) group.events.push(event);
      else groups.push({ label, events: [event] });
    });

    agendaList.innerHTML = groups.map((group) => `
      <section class="chain-agenda-group">
        <h3 class="chain-agenda-month">${escapeHtml(group.label)}</h3>
        <ol class="chain-agenda-items">
          ${group.events.map((event) => {
            const live = isLive(event);
            const past = event.end.getTime() < Date.now();
            return `
              <li class="chain-agenda-item${live ? " is-live" : ""}${past ? " is-past" : ""}">
                <div class="chain-agenda-rail" aria-hidden="true"><span></span></div>
                <div class="chain-agenda-date">
                  <strong>${event.start.getUTCDate()}</strong>
                  <small>${escapeHtml(utcFormatter({ weekday: "short" }).format(event.start))}</small>
                </div>
                <div class="chain-agenda-body">
                  <div class="chain-event-topline">
                    ${live ? '<span class="chain-live-pill"><i aria-hidden="true"></i> Live now</span>' : statusPill(event.status)}
                    <span class="chain-event-duration">${escapeHtml(formatDuration(event))}</span>
                  </div>
                  <h4>${escapeHtml(event.title)}</h4>
                  <p class="chain-agenda-time">${escapeHtml(formatRange(event))}</p>
                  <p class="chain-agenda-note">${escapeHtml(event.notes)}</p>
                  <div class="chain-agenda-meta">
                    <span><i class="fa-solid fa-crosshairs" aria-hidden="true"></i> ${escapeHtml(event.target)}</span>
                    <span><i class="fa-solid fa-user-shield" aria-hidden="true"></i> ${escapeHtml(event.lead)}</span>
                  </div>
                  <div class="chain-event-actions">
                    <button type="button" data-calendar-download="${escapeHtml(event.id)}"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Add to calendar</button>
                    <button type="button" data-goto-date="${dateKey(event.date)}"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Show on calendar</button>
                  </div>
                </div>
              </li>`;
          }).join("")}
        </ol>
      </section>`).join("");
  };

  const renderUpcoming = () => {
    if (state.isLoading && !state.events.length) {
      upcomingList.setAttribute("aria-busy", "true");
      upcomingList.innerHTML = `
        <div class="chain-upcoming-empty is-loading">
          <span aria-hidden="true"><i class="fa-solid fa-spinner fa-spin"></i></span>
          <div><strong>Checking the forward schedule&hellip;</strong><p>The latest operation windows will appear here.</p></div>
        </div>`;
      return;
    }

    upcomingList.removeAttribute("aria-busy");
    const upcoming = activeUpcomingEvents().slice(0, 6);

    if (!upcoming.length) {
      upcomingList.innerHTML = `
        <div class="chain-upcoming-empty">
          <span aria-hidden="true"><i class="fa-regular fa-calendar-check"></i></span>
          <div>
            <strong>No upcoming chain is published.</strong>
            <p>The calendar is ready for the next council announcement. Members should continue to watch Discord and faction chat for operational updates.</p>
          </div>
        </div>
      `;
      return;
    }

    upcomingList.innerHTML = upcoming.map((event) => `
      <button type="button" class="chain-upcoming-card${isLive(event) ? " is-live" : ""}" data-upcoming-date="${dateKey(event.date)}">
        <span class="chain-upcoming-date">${escapeHtml(shortDateFormatter.format(event.start))} &middot; ${escapeHtml(isLive(event) ? "Live now" : STATUS_LABELS[event.status])}</span>
        <strong>${escapeHtml(event.title)}</strong>
        <span><span>${escapeHtml(formatRange(event))}</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </button>
    `).join("");
  };

  /* ── Hero brief and live countdown ─────────────────────────── */

  const heroNodes = {
    title: $("[data-next-title]"),
    time: $("[data-next-time]"),
    alt: $("[data-next-alt-time]"),
    status: $("[data-next-status]"),
    target: $("[data-next-target]"),
    lead: $("[data-next-lead]"),
    countdown: $("[data-next-countdown]"),
    actions: $("[data-next-actions]"),
    liveBanner: $("[data-live-banner]"),
    liveCopy: $("[data-live-banner-copy]")
  };

  const countdownSegments = (milliseconds) => {
    const { days, hours, minutes, seconds } = splitDuration(milliseconds);
    const pad = (value) => String(value).padStart(2, "0");
    const parts = days
      ? [[days, days === 1 ? "day" : "days"], [pad(hours), "hrs"], [pad(minutes), "min"]]
      : [[pad(hours), "hrs"], [pad(minutes), "min"], [pad(seconds), "sec"]];
    return parts.map(([value, label]) => `
      <span class="chain-countdown-part"><b>${escapeHtml(String(value))}</b><small>${escapeHtml(label)}</small></span>`).join("");
  };

  const renderNextBrief = () => {
    const live = liveEvents()[0];
    const nextEvent = live || activeUpcomingEvents()[0];

    if (state.isLoading && !state.events.length) {
      if (heroNodes.title) heroNodes.title.textContent = "Loading schedule…";
      if (heroNodes.time) heroNodes.time.textContent = "Syncing the latest operation window from council.";
      if (heroNodes.alt) heroNodes.alt.textContent = "";
      if (heroNodes.status) heroNodes.status.textContent = "Syncing";
      if (heroNodes.target) heroNodes.target.textContent = "—";
      if (heroNodes.lead) heroNodes.lead.textContent = "—";
      if (heroNodes.countdown) {
        heroNodes.countdown.removeAttribute("data-mode");
        heroNodes.countdown.innerHTML = '<span class="chain-countdown-idle"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Checking the council calendar…</span>';
      }
      if (heroNodes.actions) heroNodes.actions.hidden = true;
      return;
    }

    if (heroNodes.liveBanner) {
      heroNodes.liveBanner.hidden = !live;
      if (live && heroNodes.liveCopy) {
        heroNodes.liveCopy.textContent =
          `${live.title} is running now — ${compactCountdown(live.end.getTime() - Date.now())} of the window remains.`;
      }
    }

    if (!nextEvent) {
      if (heroNodes.title) heroNodes.title.textContent = state.loadError ? "Schedule unavailable" : "Awaiting announcement";
      if (heroNodes.time) {
        heroNodes.time.textContent = state.loadError
          ? "The published calendar could not be loaded. Check Discord for the latest chain announcement."
          : "No chain window is currently published. Council will announce the next operation here and in Discord.";
      }
      if (heroNodes.alt) heroNodes.alt.textContent = "";
      if (heroNodes.status) heroNodes.status.textContent = state.loadError ? "Unavailable" : "Schedule clear";
      if (heroNodes.target) heroNodes.target.textContent = "—";
      if (heroNodes.lead) heroNodes.lead.textContent = "—";
      if (heroNodes.countdown) {
        heroNodes.countdown.innerHTML = '<span class="chain-countdown-idle">No operation scheduled</span>';
      }
      if (heroNodes.actions) heroNodes.actions.hidden = true;
      return;
    }

    if (heroNodes.title) heroNodes.title.textContent = nextEvent.title;
    if (heroNodes.time) {
      heroNodes.time.textContent = `${fullDateFormatter.format(nextEvent.start)} · ${formatRange(nextEvent)}`;
    }
    if (heroNodes.alt) heroNodes.alt.textContent = formatAlternateRange(nextEvent);
    if (heroNodes.status) heroNodes.status.textContent = live ? "In progress" : STATUS_LABELS[nextEvent.status];
    if (heroNodes.target) heroNodes.target.textContent = nextEvent.target;
    if (heroNodes.lead) heroNodes.lead.textContent = nextEvent.lead;

    if (heroNodes.countdown) {
      heroNodes.countdown.dataset.mode = live ? "live" : "waiting";
      heroNodes.countdown.innerHTML = live
        ? `<span class="chain-countdown-label">Time remaining</span>${countdownSegments(nextEvent.end.getTime() - Date.now())}`
        : `<span class="chain-countdown-label">Starts in</span>${countdownSegments(nextEvent.start.getTime() - Date.now())}`;
    }

    if (heroNodes.actions) {
      heroNodes.actions.hidden = false;
      heroNodes.actions.dataset.eventId = nextEvent.id;
    }
  };

  /* Remaining-time lines inside any live event card. */
  const renderLiveRemaining = () => {
    $$("[data-live-remaining]").forEach((node) => {
      const event = state.events.find((item) => item.id === node.dataset.liveRemaining);
      if (!event) return;
      node.innerHTML = `<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> ${escapeHtml(compactCountdown(event.end.getTime() - Date.now()))} remaining in this window`;
    });
  };

  /* ── Summary strip ─────────────────────────────────────────── */

  const renderSummary = () => {
    const summary = $("[data-schedule-summary]");
    if (!summary) return;

    if (state.isLoading && !state.events.length) {
      summary.setAttribute("aria-busy", "true");
      summary.innerHTML = ["Upcoming windows", "Confirmed", "Provisional", "Completed"].map((label) => `
        <div class="chain-summary-tile is-loading">
          <i class="fa-solid fa-circle-notch" aria-hidden="true"></i>
          <strong>&mdash;</strong>
          <span>${label}</span>
        </div>`).join("");
      return;
    }

    summary.removeAttribute("aria-busy");
    const upcoming = activeUpcomingEvents();
    const confirmed = upcoming.filter((event) => event.status === "confirmed").length;
    const planning = upcoming.filter((event) => event.status === "planning").length;
    const completed = state.events.filter((event) => event.status === "completed").length;

    const tiles = [
      { label: upcoming.length === 1 ? "Upcoming window" : "Upcoming windows", value: upcoming.length, icon: "fa-calendar-days" },
      { label: "Confirmed", value: confirmed, icon: "fa-circle-check" },
      { label: "Provisional", value: planning, icon: "fa-compass-drafting" },
      { label: "Completed", value: completed, icon: "fa-flag-checkered" }
    ];

    /* A zero is context rather than news, so it is muted in the strip. */
    summary.innerHTML = tiles.map((tile) => `
      <div class="chain-summary-tile" data-zero="${tile.value === 0}">
        <i class="fa-solid ${tile.icon}" aria-hidden="true"></i>
        <strong>${tile.value}</strong>
        <span>${escapeHtml(tile.label)}</span>
      </div>`).join("");
  };

  /* ── Zone and view controls ────────────────────────────────── */

  const renderControls = () => {
    $$("[data-zone-option]").forEach((button) => {
      const active = button.dataset.zoneOption === state.zone;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $$("[data-view-option]").forEach((button) => {
      const active = button.dataset.viewOption === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const localButton = $('[data-zone-option="local"]');
    if (localButton) {
      localButton.hidden = viewerIsUtc;
      localButton.querySelector("span").textContent = localAbbreviation;
    }

    const zoneNote = $("[data-zone-note]");
    if (zoneNote) {
      zoneNote.textContent = viewerIsUtc
        ? "Your device is already on Torn City Time."
        : state.zone === "local"
          ? `Times shown in ${localAbbreviation}. Torn City Time is listed underneath.`
          : `Times shown in Torn City Time. Your local time (${localAbbreviation}) is listed underneath.`;
    }

    $$("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== state.view;
    });

    const pastToggle = $("[data-toggle-past]");
    if (pastToggle) {
      pastToggle.setAttribute("aria-pressed", String(state.showPast));
      pastToggle.querySelector("span").textContent = state.showPast ? "Hide past operations" : "Show past operations";
    }
  };

  const setZone = (zone) => {
    if (state.zone === zone) return;
    state.zone = zone;
    writeStorage(ZONE_KEY, zone);
    renderAll();
  };

  const setView = (view) => {
    if (state.view === view) return;
    state.view = view;
    writeStorage(VIEW_KEY, view);
    renderControls();
    renderAgenda();
  };

  const renderAll = () => {
    renderControls();
    renderCalendar();
    renderDateDetail();
    renderAgenda();
    renderUpcoming();
    renderSummary();
    renderNextBrief();
    renderLiveRemaining();
  };

  const renderPreparationProgress = (event) => {
    const completed = new Set(state.preparation[event.id] || []);
    const count = event.expectations.filter((item) => completed.has(item)).length;
    const percent = event.expectations.length ? Math.round((count / event.expectations.length) * 100) : 0;

    $$('[data-prep-panel]').filter((panel) => panel.dataset.prepPanel === event.id).forEach((panel) => {
      const countNode = panel.querySelector("[data-prep-count]");
      const meter = panel.querySelector(".chain-preparation-meter");
      const fill = meter?.querySelector("span");
      if (countNode) countNode.textContent = `${count} of ${event.expectations.length} ready`;
      if (meter) meter.setAttribute("aria-valuenow", String(count));
      if (fill) fill.style.setProperty("--chain-preparation-progress", `${percent}%`);
      panel.classList.toggle("is-complete", count === event.expectations.length);
    });

    return count;
  };

  /* ── Navigation ────────────────────────────────────────────── */

  const focusSelectedDay = () => {
    window.requestAnimationFrame(() => {
      calendarBody.querySelector(`[data-date="${dateKey(state.selectedDate)}"]`)?.focus({ preventScroll: true });
    });
  };

  const selectDate = (date, { focusCalendar = false, revealDetail = false, updateHash = false } = {}) => {
    state.selectedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    state.visibleMonth = startOfMonth(state.selectedDate);
    renderCalendar();
    renderDateDetail();
    renderLiveRemaining();

    if (updateHash) history.replaceState(null, "", `#date=${dateKey(state.selectedDate)}`);
    if (focusCalendar) focusSelectedDay();
    if (revealDetail && window.matchMedia("(max-width: 1020px)").matches) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => dateDetail.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      }));
    }
  };

  const changeMonth = (amount) => selectDate(addMonths(state.selectedDate, amount));

  const moveFromKey = (date, event) => {
    const mondayIndex = (date.getUTCDay() + 6) % 7;
    if (event.key === "ArrowLeft") return addDays(date, -1);
    if (event.key === "ArrowRight") return addDays(date, 1);
    if (event.key === "ArrowUp") return addDays(date, -7);
    if (event.key === "ArrowDown") return addDays(date, 7);
    if (event.key === "Home") return addDays(date, -mondayIndex);
    if (event.key === "End") return addDays(date, 6 - mondayIndex);
    if (event.key === "PageUp") return addMonths(date, event.shiftKey ? -12 : -1);
    if (event.key === "PageDown") return addMonths(date, event.shiftKey ? 12 : 1);
    return null;
  };

  /* ── Calendar export ───────────────────────────────────────── */

  const icsEscape = (value) => String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(/\r?\n/g, "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");

  const icsDate = (date) => date.toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const foldIcsLine = (line) => {
    const chunks = [];
    let remaining = line;
    while (remaining.length > 73) {
      chunks.push(remaining.slice(0, 73));
      remaining = ` ${remaining.slice(73)}`;
    }
    chunks.push(remaining);
    return chunks.join("\r\n");
  };

  const eventBlock = (event) => {
    const descriptionParts = [event.notes, `Target: ${event.target}`, `Chain lead: ${event.lead}`, `Live channel: ${event.rallyPoint}`];
    if (event.expectations.length) descriptionParts.push(`Preparation: ${event.expectations.join("; ")}`);
    const status = event.status === "cancelled" ? "CANCELLED" : event.status === "planning" ? "TENTATIVE" : "CONFIRMED";
    return [
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@privecartel.com`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(event.start)}`,
      `DTEND:${icsDate(event.end)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(descriptionParts.join("\n"))}`,
      `STATUS:${status}`,
      event.briefingUrl ? `URL:${event.briefingUrl}` : "",
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(`${event.title} starts in 30 minutes`)}`,
      "END:VALARM",
      "END:VEVENT"
    ].filter(Boolean);
  };

  const downloadIcs = (events, filename, message) => {
    if (!events.length) return;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Prive Cartel//Chain Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Prive Cartel chain schedule",
      ...events.flatMap(eventBlock),
      "END:VCALENDAR"
    ].map(foldIcsLine);

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(message);
  };

  const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const downloadEvent = (event) => downloadIcs(
    [event],
    `${slug(event.title) || "chain-event"}.ics`,
    `${event.title} calendar file downloaded.`
  );

  const downloadAll = () => {
    const events = activeUpcomingEvents();
    if (!events.length) {
      announce("There are no upcoming chains to export yet.");
      return;
    }
    downloadIcs(events, "prive-cartel-chain-schedule.ics",
      `${events.length} upcoming chain${events.length === 1 ? "" : "s"} downloaded as a calendar file.`);
  };

  /* Plain-text brief for pasting into Discord or faction chat. */
  const copyEvent = async (event) => {
    const lines = [
      event.title,
      `${fullDateFormatter.format(event.start)} · ${timeIn(event.start)}–${timeIn(event.end)} ${zoneLabel()}`,
      `Status: ${STATUS_LABELS[event.status]}`,
      `Target: ${event.target}`,
      `Chain lead: ${event.lead}`,
      `Live channel: ${event.rallyPoint}`,
      "",
      event.notes
    ];
    if (event.expectations.length) {
      lines.push("", "Preparation:", ...event.expectations.map((item) => `• ${item}`));
    }
    lines.push("", `${location.origin}${location.pathname}#date=${dateKey(event.date)}`);

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    announce(`${event.title} details copied to the clipboard.`);
  };

  let announceTimer = 0;
  const announce = (message) => {
    if (!scheduleStatus) return;
    window.clearTimeout(announceTimer);
    scheduleStatus.textContent = message;
    scheduleStatus.classList.remove("is-error");
    announceTimer = window.setTimeout(() => {
      scheduleStatus.textContent = defaultStatusMessage();
      scheduleStatus.classList.toggle("is-error", state.loadError || state.refreshError);
    }, 6000);
  };

  const defaultStatusMessage = () => {
    if (state.loadError) return "The published schedule could not be loaded. Check Discord for the latest chain announcement.";
    if (state.refreshError) return "The schedule could not be refreshed. Showing the last successful update.";
    const updated = formatUpdated();
    return updated ? `Council schedule last updated ${updated}.` : "Council schedule loaded.";
  };

  /* ── Events ────────────────────────────────────────────────── */

  calendarBody.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    selectDate(dateFromKey(dayButton.dataset.date), {
      focusCalendar: true,
      revealDetail: event.detail > 0,
      updateHash: true
    });
  });

  calendarBody.addEventListener("keydown", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    const destination = moveFromKey(dateFromKey(dayButton.dataset.date), event);
    if (!destination) return;
    event.preventDefault();
    selectDate(destination, { focusCalendar: true });
  });

  document.addEventListener("click", (event) => {
    const download = event.target.closest("[data-calendar-download]");
    if (download) {
      const chainEvent = state.events.find((item) => item.id === download.dataset.calendarDownload);
      if (chainEvent) downloadEvent(chainEvent);
      return;
    }

    const copy = event.target.closest("[data-copy-event]");
    if (copy) {
      const chainEvent = state.events.find((item) => item.id === copy.dataset.copyEvent);
      if (chainEvent) copyEvent(chainEvent);
      return;
    }

    const goto = event.target.closest("[data-goto-date]");
    if (goto) {
      if (state.view !== "calendar") setView("calendar");
      selectDate(dateFromKey(goto.dataset.gotoDate), { focusCalendar: true, updateHash: true });
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("calendar")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      return;
    }

    const zoneButton = event.target.closest("[data-zone-option]");
    if (zoneButton) {
      setZone(zoneButton.dataset.zoneOption);
      return;
    }

    const viewButton = event.target.closest("[data-view-option]");
    if (viewButton) {
      setView(viewButton.dataset.viewOption);
      return;
    }

    if (event.target.closest("[data-toggle-past]")) {
      state.showPast = !state.showPast;
      renderControls();
      renderAgenda();
      return;
    }

    if (event.target.closest("[data-download-all]")) downloadAll();
  });

  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-prep-check]");
    if (!checkbox) return;
    const chainEvent = state.events.find((item) => item.id === checkbox.dataset.eventId);
    const item = chainEvent?.expectations[Number(checkbox.dataset.prepIndex)];
    if (!chainEvent || !item) return;

    const completed = new Set(state.preparation[chainEvent.id] || []);
    if (checkbox.checked) completed.add(item);
    else completed.delete(item);

    state.preparation[chainEvent.id] = [...completed];
    writeStorage(PREPARATION_KEY, JSON.stringify(state.preparation));
    const count = renderPreparationProgress(chainEvent);
    announce(count === chainEvent.expectations.length
      ? `${chainEvent.title} preparation complete.`
      : `${count} of ${chainEvent.expectations.length} preparation items complete.`);
  });

  upcomingList.addEventListener("click", (event) => {
    const upcomingButton = event.target.closest("[data-upcoming-date]");
    if (!upcomingButton) return;
    selectDate(dateFromKey(upcomingButton.dataset.upcomingDate), { focusCalendar: true, updateHash: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("calendar")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });

  $("[data-calendar-previous]")?.addEventListener("click", () => changeMonth(-1));
  $("[data-calendar-next]")?.addEventListener("click", () => changeMonth(1));
  $("[data-calendar-today]")?.addEventListener("click", () => selectDate(state.today, { focusCalendar: true }));

  $("[data-next-actions]")?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const chainEvent = state.events.find((item) => item.id === event.currentTarget.dataset.eventId);
    if (!chainEvent) return;
    if (button.dataset.heroAction === "download") downloadEvent(chainEvent);
    if (button.dataset.heroAction === "copy") copyEvent(chainEvent);
  });

  /* ── Loading ───────────────────────────────────────────────── */

  const applyHashDate = () => {
    const match = /^#date=(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
    if (!match) return false;
    const date = dateFromKey(match[1]);
    if (Number.isNaN(date.getTime())) return false;
    state.selectedDate = date;
    state.visibleMonth = startOfMonth(date);
    return true;
  };

  const scheduleSignature = (schedule) => JSON.stringify({
    updatedAt: schedule.updatedAt,
    events: schedule.events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      status: event.status,
      target: event.target,
      lead: event.lead,
      rallyPoint: event.rallyPoint,
      notes: event.notes,
      expectations: event.expectations,
      briefingUrl: event.briefingUrl
    }))
  });

  const loadSchedule = async ({ silent = false } = {}) => {
    if (!silent) {
      state.isLoading = true;
      calendarSection?.setAttribute("aria-busy", "true");
      if (scheduleRetry) scheduleRetry.hidden = true;
      if (scheduleStatus) {
        scheduleStatus.textContent = "Loading the latest council schedule…";
        scheduleStatus.classList.remove("is-error");
      }
      renderAll();
    }

    try {
      const response = await fetch("data/chain-schedule.json", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const loaded = normaliseSchedule(await response.json());
      const changed = scheduleSignature(loaded) !== scheduleSignature(state.schedule);

      state.schedule = loaded;
      state.events = loaded.events;
      state.loadError = false;
      state.refreshError = false;
      state.isLoading = false;
      state.hasLoaded = true;

      /* On first load, open on the next operation unless a link named a date. */
      if (!silent && !applyHashDate()) {
        const nextEvent = liveEvents()[0] || activeUpcomingEvents()[0];
        if (nextEvent) {
          state.selectedDate = nextEvent.date;
          state.visibleMonth = startOfMonth(nextEvent.date);
        }
      }

      if (scheduleStatus) {
        scheduleStatus.classList.remove("is-error");
        scheduleStatus.textContent = silent && changed
          ? "The schedule was updated by council just now."
          : defaultStatusMessage();
      }
      if (scheduleRetry) scheduleRetry.hidden = true;
    } catch (error) {
      console.error("Chain schedule could not be loaded.", error);
      if (!silent && !state.hasLoaded) {
        state.schedule = DEFAULT_SCHEDULE;
        state.events = [];
        state.loadError = true;
        state.refreshError = false;
        state.isLoading = false;
        if (scheduleStatus) {
          scheduleStatus.textContent = defaultStatusMessage();
          scheduleStatus.classList.add("is-error");
        }
      } else {
        state.isLoading = false;
        state.refreshError = true;
        if (scheduleStatus) {
          scheduleStatus.textContent = defaultStatusMessage();
          scheduleStatus.classList.add("is-error");
        }
      }
      if (scheduleRetry) scheduleRetry.hidden = false;
    }

    calendarSection?.removeAttribute("aria-busy");
    renderAll();
  };

  scheduleRetry?.addEventListener("click", () => loadSchedule());

  window.addEventListener("hashchange", () => {
    if (applyHashDate()) {
      renderCalendar();
      renderDateDetail();
    }
  });

  applyHashDate();
  loadSchedule();

  /* The hero countdown is the reason members open this page. */
  window.setInterval(() => {
    if (document.hidden) return;
    renderNextBrief();
    renderLiveRemaining();
  }, 1000);

  /* Pick up a council publish without needing a manual reload. */
  window.setInterval(() => {
    if (!document.hidden) loadSchedule({ silent: true });
  }, REFRESH_INTERVAL);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadSchedule({ silent: true });
  });
})();
