/* the quiet hours. — no dependencies, no requests, just a little time. */
(() => {
  "use strict";

  const STORAGE_KEY = "the-quiet-hours:v1";
  const LOCK_KEY = `${STORAGE_KEY}:lease`;
  const MODES = ["focus", "short", "long"];
  const MODE_NAMES = { focus: "focus", short: "short break", long: "long break" };
  const DEFAULT_SETTINGS = {
    durations: { focus: 25, short: 5, long: 15 },
    theme: "system",
    autoStart: false,
    sound: false,
    volume: 25,
    notifications: false,
  };
  const MESSAGES = [
    "one thing at a time.",
    "the world can wait a little.",
    "slow progress is still progress.",
    "rest is part of the process.",
    "you’ve done enough for this moment.",
    "there is room to begin again.",
  ];

  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
  const finite = (value) => typeof value === "number" && Number.isFinite(value);

  function localDay(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function settingsFrom(input = {}) {
    const output = clone(DEFAULT_SETTINGS);
    for (const mode of MODES) {
      const value = input?.durations?.[mode];
      if (Number.isInteger(value) && value >= 1 && value <= 180) output.durations[mode] = value;
    }
    if (["system", "light", "dark"].includes(input?.theme)) output.theme = input.theme;
    for (const key of ["autoStart", "sound", "notifications"]) output[key] = input?.[key] === true;
    if (finite(input?.volume)) output.volume = clamp(Math.round(input.volume), 0, 100);
    return output;
  }

  function freshTimer(mode, settings, now, running = false) {
    const durationMs = settings.durations[mode] * 60000;
    return {
      id: id(), mode, status: running ? "running" : "idle", durationMs,
      remainingMs: durationMs, endsAt: running ? now + durationMs : null,
    };
  }

  function createState(now = Date.now()) {
    const settings = clone(DEFAULT_SETTINGS);
    return {
      version: 1, revision: 0, updatedAt: now, settings,
      timer: freshTimer("focus", settings, now),
      cycle: 0, longBreakReady: false, days: {}, intention: "", messageIndex: 0,
    };
  }

  // Treat stored data as input. A broken or older record must never break the page.
  function sanitizeState(input, now = Date.now()) {
    const state = createState(now);
    if (!input || input.version !== 1) return state;
    state.settings = settingsFrom(input.settings);
    state.timer = freshTimer("focus", state.settings, now);
    const timer = input.timer;
    if (timer && MODES.includes(timer.mode) && ["idle", "paused", "running"].includes(timer.status)
      && finite(timer.durationMs) && timer.durationMs >= 60000 && timer.durationMs <= 10800000
      && finite(timer.remainingMs) && timer.remainingMs >= 0 && timer.remainingMs <= timer.durationMs
      && (timer.status !== "running" || (finite(timer.endsAt) && timer.endsAt > 0 && timer.endsAt <= now + timer.durationMs + 1000))) {
      state.timer = {
        id: typeof timer.id === "string" ? timer.id.slice(0, 100) : id(),
        mode: timer.mode, status: timer.status, durationMs: timer.durationMs,
        remainingMs: timer.remainingMs, endsAt: timer.status === "running" ? timer.endsAt : null,
      };
    }
    state.cycle = Number.isInteger(input.cycle) ? clamp(input.cycle, 0, 3) : 0;
    state.longBreakReady = input.longBreakReady === true;
    state.intention = typeof input.intention === "string" ? input.intention.slice(0, 100) : "";
    state.messageIndex = Number.isInteger(input.messageIndex) ? Math.abs(input.messageIndex) % MESSAGES.length : 0;
    state.revision = Number.isSafeInteger(input.revision) && input.revision >= 0 ? input.revision : 0;
    state.updatedAt = finite(input.updatedAt) ? input.updatedAt : now;
    if (input.days && typeof input.days === "object") {
      for (const [day, entry] of Object.entries(input.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && entry && Number.isInteger(entry.sessions)
          && entry.sessions >= 0 && finite(entry.focusMs) && entry.focusMs >= 0) {
          state.days[day] = { sessions: entry.sessions, focusMs: entry.focusMs };
        }
      }
    }
    return state;
  }

  function remainingAt(state, now = Date.now()) {
    return state.timer.status === "running"
      ? clamp(state.timer.endsAt - now, 0, state.timer.durationMs)
      : state.timer.remainingMs;
  }

  // A late wake-up completes only the session actually started. It never invents
  // hours of unattended sessions. Auto-start begins the next session when noticed.
  function reconcile(state, now) {
    const timer = state.timer;
    if (timer.status !== "running" || timer.endsAt > now) return [];
    const event = { id: timer.id, mode: timer.mode, endedAt: timer.endsAt };
    let next = "focus";
    if (timer.mode === "focus") {
      const day = localDay(timer.endsAt);
      const totals = state.days[day] || { sessions: 0, focusMs: 0 };
      state.days[day] = { sessions: totals.sessions + 1, focusMs: totals.focusMs + timer.durationMs };
      state.cycle = (state.cycle + 1) % 4;
      next = state.cycle === 0 ? "long" : "short";
      state.longBreakReady = next === "long";
    } else {
      state.longBreakReady = false;
    }
    state.messageIndex = (state.messageIndex + 1) % MESSAGES.length;
    state.timer = freshTimer(next, state.settings, now, state.settings.autoStart);
    return [event];
  }

  function transition(previous, action, now = Date.now()) {
    const state = clone(previous);
    const events = reconcile(state, now);
    const timer = state.timer;
    switch (action.type) {
      case "START":
        if (timer.status !== "running") {
          timer.endsAt = now + timer.remainingMs;
          timer.status = "running";
        }
        break;
      case "PAUSE":
        if (timer.status === "running") {
          timer.remainingMs = remainingAt(state, now);
          timer.endsAt = null;
          timer.status = "paused";
        }
        break;
      case "RESET":
        state.timer = freshTimer(timer.mode, state.settings, now);
        break;
      case "SKIP":
        state.timer = freshTimer(timer.mode === "focus" ? "short" : "focus", state.settings, now);
        if (state.timer.mode === "focus") state.longBreakReady = false;
        state.messageIndex = (state.messageIndex + 1) % MESSAGES.length;
        break;
      case "MODE":
        if (MODES.includes(action.mode) && action.mode !== timer.mode) state.timer = freshTimer(action.mode, state.settings, now);
        if (state.timer.mode === "focus") state.longBreakReady = false;
        break;
      case "SETTINGS":
        state.settings = settingsFrom(action.settings);
        if (timer.status === "idle") state.timer = freshTimer(timer.mode, state.settings, now);
        break;
      case "THEME":
        if (["light", "dark", "system"].includes(action.theme)) state.settings.theme = action.theme;
        break;
      case "INTENTION":
        state.intention = String(action.value).slice(0, 100);
        break;
      case "TICK":
        if (!events.length) return { state: previous, events: [] };
        break;
      default:
        break;
    }
    state.revision += 1;
    state.updatedAt = now;
    return { state, events };
  }

  function formatTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  // The same dependency-free engine can be checked with Node, without shipping a test runner.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createState, sanitizeState, transition, remainingAt, localDay, formatTime, settingsFrom };
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    timer: $("#timer"), caption: $("#timer-caption"), progress: $("#progress"), fill: $("#progress-fill"),
    start: $("#start-pause"), startLabel: $("#start-label"), play: $("#play-icon"), pause: $("#pause-icon"),
    modeButtons: [...document.querySelectorAll("[data-mode]")], session: $("#session-label"),
    dots: [...document.querySelectorAll("#session-dots i")], note: $("#session-note"),
    intention: $("#intention"), totals: $("#daily-totals"), message: $("#gentle-message"),
    dialog: $("#settings-dialog"), form: $("#settings-form"), feedback: $("#settings-feedback"),
    theme: $("#theme-toggle"), announcer: $("#announcer"), notice: $("#notice"),
  };
  let storageAvailable = true;
  let storageWarningShown = false;
  let cachedState = createState();
  let state;
  let completionPending = false;
  let mutationQueue = Promise.resolve();
  let noticeTimeout;
  let audioContext;
  let audioUnlocked = false;
  const tabId = id();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let channel;
  try { channel = new BroadcastChannel(STORAGE_KEY); } catch { /* Storage events also synchronize tabs. */ }

  function notify(message) {
    ui.notice.textContent = message;
    ui.notice.hidden = false;
    clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => { ui.notice.hidden = true; }, 6000);
  }

  function storageFailed() {
    storageAvailable = false;
    if (!storageWarningShown) {
      storageWarningShown = true;
      notify("saving is unavailable. your timer still works for this visit.");
    }
  }

  function readState() {
    if (storageAvailable) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try { cachedState = sanitizeState(JSON.parse(raw)); }
          catch { /* Keep a usable in-memory state when a record is malformed. */ }
        }
      } catch { storageFailed(); }
    }
    return clone(cachedState);
  }

  function writeState(next) {
    cachedState = next;
    if (storageAvailable) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
      catch { storageFailed(); }
    }
    try { channel?.postMessage({ revision: next.revision, from: tabId }); } catch { /* Optional. */ }
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Web Locks serializes edits and completion across tabs. The short localStorage
  // lease is a best-effort fallback for browsers without this API; no timer loop
  // is created by pressing begin, so repeated clicks cannot create extra timers.
  async function withLease(callback) {
    if (!storageAvailable) return callback();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const raw = localStorage.getItem(LOCK_KEY);
        let lease;
        try { lease = raw ? JSON.parse(raw) : null; } catch { lease = null; }
        if (!lease || !finite(lease.until) || lease.until <= Date.now() || lease.owner === tabId) {
          localStorage.setItem(LOCK_KEY, JSON.stringify({ owner: tabId, until: Date.now() + 2000 }));
          await wait(20 + Math.random() * 20);
          if (JSON.parse(localStorage.getItem(LOCK_KEY) || "null")?.owner === tabId) {
            try { return callback(); }
            finally {
              if (JSON.parse(localStorage.getItem(LOCK_KEY) || "null")?.owner === tabId) localStorage.removeItem(LOCK_KEY);
            }
          }
        }
      } catch { storageFailed(); return callback(); }
      await wait(35 + Math.random() * 30);
    }
    notify("another tab is updating. please try again in a moment.");
    return undefined;
  }

  function locked(callback) {
    const run = async () => {
      if (navigator.locks?.request) {
        try { return await navigator.locks.request(STORAGE_KEY, callback); }
        catch { /* Some browsers expose Web Locks but deny access to it. */ }
      }
      return withLease(callback);
    };
    // Keep input events in order within this tab as well as across tabs.
    const operation = mutationQueue.then(run, run);
    mutationQueue = operation.catch(() => {});
    return operation;
  }

  function announce(message) { ui.announcer.textContent = message; }

  async function dispatch(action, { silent = false } = {}) {
    try {
      await locked(() => {
        const previous = readState();
        const result = transition(previous, action, Date.now());
        state = result.state;
        if (result.state !== previous) writeState(state);
        render();
        for (const event of result.events) onComplete(event, silent);
      });
    } catch {
      notify("that change couldn’t be saved. please try once more.");
    }
  }

  function applyTheme() {
    const dark = state.settings.theme === "dark" || (state.settings.theme === "system" && media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const label = `switch to ${dark ? "light" : "dark"} theme`;
    ui.theme.setAttribute("aria-label", label);
    ui.theme.title = label;
    $("meta[name='theme-color']").content = dark ? "#20221F" : "#F7F5F0";
  }

  function render() {
    if (!state) return;
    const left = remainingAt(state);
    const time = formatTime(left);
    if (ui.timer.textContent !== time) {
      ui.timer.textContent = time;
      const seconds = Math.ceil(left / 1000);
      ui.timer.setAttribute("aria-label", `${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds remaining`);
    }
    const { mode, status, durationMs } = state.timer;
    const progress = clamp((1 - left / durationMs) * 100, 0, 100);
    ui.fill.style.transform = `scaleX(${progress / 100})`;
    ui.progress.setAttribute("aria-valuenow", String(Math.round(progress)));
    ui.progress.setAttribute("aria-valuetext", `${Math.round(progress)} percent of this session`);
    ui.startLabel.textContent = status === "running" ? "pause" : status === "paused" ? "continue" : "begin";
    ui.start.setAttribute("aria-label", `${ui.startLabel.textContent} ${MODE_NAMES[mode]} session`);
    ui.play.hidden = status === "running";
    ui.pause.hidden = status !== "running";
    ui.caption.textContent = status === "paused" ? "right here when you’re ready." : mode === "focus" ? "a little space to focus." : mode === "short" ? "stretch. breathe. just be." : "a little longer to do nothing.";
    for (const button of ui.modeButtons) {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    const completed = state.longBreakReady ? 4 : state.cycle;
    const number = mode === "focus" ? state.cycle + 1 : completed || 1;
    ui.session.textContent = `session ${String(number).padStart(2, "0")} / 04`;
    ui.dots.forEach((dot, index) => dot.classList.toggle("is-complete", index < completed));
    ui.note.textContent = mode === "long" ? "make a little room for rest." : "";
    if (document.activeElement !== ui.intention) ui.intention.value = state.intention;
    const today = state.days[localDay(Date.now())] || { sessions: 0, focusMs: 0 };
    const minutes = new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(today.focusMs / 60000);
    ui.totals.children[0].textContent = `${today.sessions} focus session${today.sessions === 1 ? "" : "s"}`;
    ui.totals.children[2].textContent = `${minutes} minute${today.focusMs === 60000 ? "" : "s"}`;
    ui.message.textContent = MESSAGES[state.messageIndex];
    document.title = `${time} · ${MODE_NAMES[mode]} — the quiet hours.`;
    applyTheme();
  }

  // Audio is synthesized locally. It is unlocked only inside a real user gesture,
  // never on load, refresh, visibility changes, or another tab's storage event.
  function unlockAudio() {
    if (!state.settings.sound && !$("#sound-enabled").checked) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext ||= new Audio();
      audioUnlocked = true;
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    } catch { /* Audio is optional. The timer remains usable. */ }
  }

  function playBell(volume = state.settings.volume) {
    if (!audioUnlocked || !audioContext || audioContext.state !== "running" || volume <= 0) return;
    try {
      const now = audioContext.currentTime;
      for (const [frequency, offset, strength] of [[659.25, 0, 1], [987.77, 0.13, 0.35]]) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(volume / 100 * 0.12 * strength, now + offset + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 1.65);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 1.7);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    } catch { /* Audio failure must not interfere with session completion. */ }
  }

  function onComplete(event, silent) {
    const message = event.mode === "focus"
      ? state.timer.mode === "long" ? "four little moments of focus. a longer rest is ready." : "a little focus, complete. time for a breath."
      : "your rest is complete. begin again when you’re ready.";
    announce(message);
    if (silent) return;
    if (state.settings.sound) playBell();
    if (state.settings.notifications && "Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("the quiet hours.", { body: message, tag: `quiet-${event.id}`, silent: true });
        notification.onclick = () => { window.focus(); notification.close(); };
        setTimeout(() => notification.close(), 12000);
      } catch { /* Some mobile browsers expose Notification without a working constructor. */ }
    }
  }

  function syncFromStorage() {
    state = readState();
    render();
    checkCompletion();
  }

  function checkCompletion(silent = false) {
    if (!state || completionPending || state.timer.status !== "running" || remainingAt(state) > 0) return;
    completionPending = true;
    dispatch({ type: "TICK" }, { silent }).finally(() => { completionPending = false; });
  }

  ui.start.addEventListener("click", async () => {
    unlockAudio();
    const action = state.timer.status === "running" ? "PAUSE" : "START";
    await dispatch({ type: action });
    announce(`${MODE_NAMES[state.timer.mode]} ${state.timer.status === "running" ? "started" : "paused"}.`);
  });
  $("#reset").addEventListener("click", async () => {
    await dispatch({ type: "RESET" });
    announce("session reset. begin when you’re ready.");
  });
  $("#skip").addEventListener("click", async () => {
    await dispatch({ type: "SKIP" });
    announce(`session skipped. ${MODE_NAMES[state.timer.mode]} is ready.`);
  });
  ui.modeButtons.forEach((button) => button.addEventListener("click", async () => {
    await dispatch({ type: "MODE", mode: button.dataset.mode });
    announce(`${MODE_NAMES[state.timer.mode]} is ready.`);
  }));
  ui.theme.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    dispatch({ type: "THEME", theme });
  });
  ui.intention.addEventListener("input", () => { dispatch({ type: "INTENTION", value: ui.intention.value }); });

  function notificationHelp() {
    const available = "Notification" in window && window.isSecureContext;
    const denied = available && Notification.permission === "denied";
    $("#notifications-enabled").disabled = !available || denied;
    $("#notification-help").textContent = !available ? "not available in this browser or on this address."
      : denied ? "blocked in your browser’s site permissions." : "a quiet nudge when it’s time to rest.";
    return available && !denied;
  }

  function openSettings() {
    const settings = state.settings;
    for (const mode of MODES) $(`#duration-${mode}`).value = settings.durations[mode];
    $("#auto-start").checked = settings.autoStart;
    $("#sound-enabled").checked = settings.sound;
    $("#sound-volume").value = settings.volume;
    $("#notifications-enabled").checked = settings.notifications && "Notification" in window && Notification.permission === "granted";
    $("#theme-select").value = settings.theme;
    ui.feedback.textContent = "";
    notificationHelp();
    ui.dialog.showModal();
  }
  $("#settings-open").addEventListener("click", openSettings);
  $("#settings-close").addEventListener("click", () => ui.dialog.close());
  ui.dialog.addEventListener("click", (event) => {
    if (event.target !== ui.dialog) return;
    const box = ui.dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) ui.dialog.close();
  });
  ui.dialog.addEventListener("close", () => $("#settings-open").focus());
  $("#sound-enabled").addEventListener("change", () => { if ($("#sound-enabled").checked) unlockAudio(); });
  $("#test-sound").addEventListener("click", () => {
    if (!$("#sound-enabled").checked) {
      ui.feedback.textContent = "turn on the gentle bell to listen.";
      return;
    }
    unlockAudio();
    if (!audioContext) {
      ui.feedback.textContent = "the bell isn’t available in this browser.";
      return;
    }
    Promise.resolve(audioContext.resume()).then(() => {
      playBell(Number($("#sound-volume").value));
      ui.feedback.textContent = "";
    }).catch(() => { ui.feedback.textContent = "your browser couldn’t play the bell."; });
  });

  $("#notifications-enabled").addEventListener("change", async () => {
    const checkbox = $("#notifications-enabled");
    if (!checkbox.checked || !notificationHelp()) return;
    checkbox.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      checkbox.checked = permission === "granted";
      if (permission !== "granted") ui.feedback.textContent = "no reminders for now. your timer works just the same.";
    } catch {
      checkbox.checked = false;
      ui.feedback.textContent = "reminders aren’t available here. your timer is ready.";
    } finally { notificationHelp(); }
  });

  ui.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ui.form.reportValidity()) return;
    unlockAudio();
    const settings = {
      durations: Object.fromEntries(MODES.map((mode) => [mode, Number($(`#duration-${mode}`).value)])),
      autoStart: $("#auto-start").checked,
      sound: $("#sound-enabled").checked,
      volume: Number($("#sound-volume").value),
      notifications: $("#notifications-enabled").checked && "Notification" in window && Notification.permission === "granted",
      theme: $("#theme-select").value,
    };
    await dispatch({ type: "SETTINGS", settings });
    ui.dialog.close();
    notify("a little more your own. settings saved.");
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) syncFromStorage();
  });
  if (channel) channel.onmessage = () => { if (storageAvailable) syncFromStorage(); };
  if (media.addEventListener) media.addEventListener("change", applyTheme);
  else media.addListener(applyTheme);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncFromStorage();
  });
  window.addEventListener("pageshow", syncFromStorage);

  state = readState();
  render();
  // An expired session restored after refresh is counted, without a surprise sound.
  dispatch({ type: "TICK" }, { silent: true });
  // One rendering interval for the lifetime of this page. Accuracy comes from
  // endsAt, never from counting interval callbacks. A local midnight updates totals.
  setInterval(() => { render(); checkCompletion(); }, 250);
})();
