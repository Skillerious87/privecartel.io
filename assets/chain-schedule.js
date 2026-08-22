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
  const previousButton = document.querySelector("[data-calendar-previous]");
  const nextButton = document.querySelector("[data-calendar-next]");
  const todayButton = document.querySelector("[data-calendar-today]");

  if (!calendarBody || !calendarMonth || !dateDetail || !upcomingList) return;

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
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const state = {
    schedule: DEFAULT_SCHEDULE,
    events: [],
    today,
    selectedDate: today,
    visibleMonth: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
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

  const tctTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC"
  });

  const localDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: localTimeZone,
    timeZoneName: "short"
  });

  const updatedFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

  const addMonths = (date, amount) => {
    const targetMonth = date.getUTCMonth() + amount;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)));
  };

  const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  const isSameMonth = (one, two) => (
    one.getUTCFullYear() === two.getUTCFullYear()
    && one.getUTCMonth() === two.getUTCMonth()
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

  const eventsForDate = (date) => {
    const dayStart = date.getTime();
    const dayEnd = addDays(date, 1).getTime();
    return state.events.filter((event) => (
      event.start.getTime() < dayEnd && event.end.getTime() > dayStart
    ));
  };

  const activeUpcomingEvents = () => {
    const currentTime = Date.now();
    return state.events.filter((event) => (
      event.end.getTime() >= currentTime
      && event.status !== "completed"
      && event.status !== "cancelled"
    ));
  };

  const formatTctRange = (event) => (
    `${tctTimeFormatter.format(event.start)}\u2013${tctTimeFormatter.format(event.end)} ${state.schedule.timeZoneLabel}`
  );

  const formatLocalRange = (event) => {
    if (localTimeZone === "UTC" || localTimeZone === "Etc/UTC") return "";
    return `${localDateTimeFormatter.format(event.start)}\u2013${localDateTimeFormatter.format(event.end)}`;
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

  const renderCalendar = () => {
    const first = startOfMonth(state.visibleMonth);
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const gridStart = addDays(first, -mondayOffset);
    const selectedKey = dateKey(state.selectedDate);
    const todayKey = dateKey(state.today);

    calendarMonth.textContent = monthFormatter.format(first);
    calendarCaption.textContent = `${monthFormatter.format(first)} chain schedule`;
    calendarBody.replaceChildren();

    for (let week = 0; week < 6; week += 1) {
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

        const eventName = document.createElement("span");
        eventName.className = "chain-day-event-name";
        eventName.textContent = dayEvents[0]?.title || "";
        button.appendChild(eventName);

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

  const statusPill = (status) => (
    `<span class="chain-status-pill is-${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status])}</span>`
  );

  const metaRow = (label, value) => value
    ? `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
    : "";

  const eventCard = (event) => {
    const localTime = formatLocalRange(event);
    const checklist = event.expectations.length
      ? `<ul class="chain-event-checklist">${event.expectations.map((item) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`
      : "";
    const briefing = event.briefingUrl
      ? `<a href="${escapeHtml(event.briefingUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open briefing</a>`
      : "";

    return `
      <article class="chain-event-card">
        <div class="chain-event-topline">
          ${statusPill(event.status)}
          <span class="chain-event-duration">${escapeHtml(formatDuration(event))}</span>
        </div>
        <h4>${escapeHtml(event.title)}</h4>
        <p class="chain-event-primary-time">${escapeHtml(formatTctRange(event))}</p>
        ${localTime ? `<p class="chain-event-local-time">Your time: ${escapeHtml(localTime)}</p>` : ""}
        <dl class="chain-event-meta">
          ${metaRow("Target", event.target)}
          ${metaRow("Chain lead", event.lead)}
          ${metaRow("Live channel", event.rallyPoint)}
        </dl>
        <p class="chain-event-note">${escapeHtml(event.notes)}</p>
        ${checklist}
        <div class="chain-event-actions">
          <button type="button" data-calendar-download="${escapeHtml(event.id)}"><i class="fa-regular fa-calendar-plus" aria-hidden="true"></i> Add to calendar</button>
          ${briefing}
        </div>
      </article>
    `;
  };

  const renderDateDetail = () => {
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
      dateDetail.innerHTML = `${head}
        <div class="chain-detail-empty">
          <span aria-hidden="true"><i class="fa-regular fa-calendar"></i></span>
          <strong>No chain scheduled</strong>
          <p>This date is clear. Select a marked date for the published window, target and preparation details.</p>
        </div>
      `;
      return;
    }

    dateDetail.innerHTML = `${head}
      <div class="chain-detail-body">
        ${selectedEvents.map(eventCard).join("")}
        ${updated ? `<p class="chain-detail-updated">Schedule updated ${escapeHtml(updated)}</p>` : ""}
      </div>
    `;
  };

  const renderUpcoming = () => {
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
      <button type="button" class="chain-upcoming-card" data-upcoming-date="${dateKey(event.date)}">
        <span class="chain-upcoming-date">${escapeHtml(shortDateFormatter.format(event.start))} &middot; ${escapeHtml(STATUS_LABELS[event.status])}</span>
        <strong>${escapeHtml(event.title)}</strong>
        <span><span>${escapeHtml(formatTctRange(event))}</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </button>
    `).join("");
  };

  const countdownLabel = (event) => {
    const difference = event.start.getTime() - Date.now();
    if (difference <= 0 && event.end.getTime() > Date.now()) return "In progress";
    if (difference <= 0) return "Window passed";

    const totalMinutes = Math.floor(difference / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${Math.max(1, minutes)}m`;
  };

  const renderNextBrief = () => {
    const nextEvent = activeUpcomingEvents()[0];
    const title = document.querySelector("[data-next-title]");
    const time = document.querySelector("[data-next-time]");
    const status = document.querySelector("[data-next-status]");
    const target = document.querySelector("[data-next-target]");
    const countdown = document.querySelector("[data-next-countdown]");

    if (!nextEvent) {
      title.textContent = "Awaiting announcement";
      time.textContent = "No chain window is currently published.";
      status.textContent = "Schedule clear";
      target.textContent = "\u2014";
      countdown.textContent = "\u2014";
      return;
    }

    title.textContent = nextEvent.title;
    time.textContent = `${fullDateFormatter.format(nextEvent.start)} \u00b7 ${formatTctRange(nextEvent)}`;
    status.textContent = STATUS_LABELS[nextEvent.status];
    target.textContent = nextEvent.target;
    countdown.textContent = countdownLabel(nextEvent);
  };

  const renderAll = () => {
    renderCalendar();
    renderDateDetail();
    renderUpcoming();
    renderNextBrief();
  };

  const focusSelectedDay = () => {
    window.requestAnimationFrame(() => {
      calendarBody.querySelector(`[data-date="${dateKey(state.selectedDate)}"]`)?.focus({ preventScroll: true });
    });
  };

  const selectDate = (date, { focusCalendar = false, revealDetail = false } = {}) => {
    state.selectedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    state.visibleMonth = startOfMonth(state.selectedDate);
    renderCalendar();
    renderDateDetail();

    if (focusCalendar) focusSelectedDay();
    if (revealDetail && window.matchMedia("(max-width: 1020px)").matches) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => dateDetail.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      }));
    }
  };

  const changeMonth = (amount) => {
    selectDate(addMonths(state.selectedDate, amount));
  };

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

  const downloadEvent = (event) => {
    const descriptionParts = [event.notes, `Target: ${event.target}`, `Chain lead: ${event.lead}`];
    if (event.expectations.length) descriptionParts.push(`Preparation: ${event.expectations.join("; ")}`);
    const status = event.status === "cancelled" ? "CANCELLED" : event.status === "planning" ? "TENTATIVE" : "CONFIRMED";
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Prive Cartel//Chain Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@privecartel.com`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(event.start)}`,
      `DTEND:${icsDate(event.end)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(descriptionParts.join("\n"))}`,
      `STATUS:${status}`,
      event.briefingUrl ? `URL:${event.briefingUrl}` : "",
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).map(foldIcsLine);

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chain-event"}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (scheduleStatus) scheduleStatus.textContent = `${event.title} calendar file downloaded.`;
  };

  calendarBody.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    selectDate(dateFromKey(dayButton.dataset.date), { revealDetail: event.detail > 0 });
  });

  calendarBody.addEventListener("keydown", (event) => {
    const dayButton = event.target.closest("[data-date]");
    if (!dayButton) return;
    const destination = moveFromKey(dateFromKey(dayButton.dataset.date), event);
    if (!destination) return;
    event.preventDefault();
    selectDate(destination, { focusCalendar: true });
  });

  dateDetail.addEventListener("click", (event) => {
    const downloadButton = event.target.closest("[data-calendar-download]");
    if (!downloadButton) return;
    const chainEvent = state.events.find((item) => item.id === downloadButton.dataset.calendarDownload);
    if (chainEvent) downloadEvent(chainEvent);
  });

  upcomingList.addEventListener("click", (event) => {
    const upcomingButton = event.target.closest("[data-upcoming-date]");
    if (!upcomingButton) return;
    selectDate(dateFromKey(upcomingButton.dataset.upcomingDate), { focusCalendar: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("calendar")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });

  previousButton?.addEventListener("click", () => changeMonth(-1));
  nextButton?.addEventListener("click", () => changeMonth(1));
  todayButton?.addEventListener("click", () => selectDate(state.today));

  const loadSchedule = async () => {
    try {
      const response = await fetch("data/chain-schedule.json", {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.schedule = normaliseSchedule(await response.json());
      state.events = state.schedule.events;

      const nextEvent = activeUpcomingEvents()[0];
      if (nextEvent) {
        state.selectedDate = nextEvent.date;
        state.visibleMonth = startOfMonth(nextEvent.date);
      }

      const updated = formatUpdated();
      if (scheduleStatus) {
        scheduleStatus.textContent = updated
          ? `Council schedule last updated ${updated}.`
          : "Council schedule loaded.";
      }
    } catch (error) {
      console.error("Chain schedule could not be loaded.", error);
      state.schedule = DEFAULT_SCHEDULE;
      state.events = [];
      if (scheduleStatus) {
        scheduleStatus.textContent = "The published schedule could not be loaded. Check Discord for the latest chain announcement.";
        scheduleStatus.classList.add("is-error");
      }
    }

    renderAll();
  };

  renderAll();
  loadSchedule();
  window.setInterval(renderNextBrief, 60000);
})();
