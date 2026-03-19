import { runAnalysis } from "./analysis/runAnalysis.js";
import { openReportWindow } from "./report/reportBuilder.js";
import { DEFAULT_STATE, STORAGE_KEY } from "./state/defaults.js";
import { renderApp } from "./ui/render.js";
import { getByPath, setByPath } from "./utils/format.js";

const app = document.getElementById("app");

let state = loadState();

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return structuredClone(DEFAULT_STATE);
    }

    return deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(saved));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function deepMerge(base, override) {
  if (!override || typeof override !== "object") {
    return base;
  }

  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      base[key] = value.map((entry) => (entry && typeof entry === "object" ? structuredClone(entry) : entry));
    } else if (value && typeof value === "object") {
      base[key] = deepMerge(base[key] || {}, value);
    } else {
      base[key] = value;
    }
  }

  return base;
}

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const snapshot = runAnalysis(state);
  app.innerHTML = renderApp(snapshot);
}

function parseInputValue(element, previousValue) {
  if (element.type === "checkbox") {
    return element.checked;
  }

  if (typeof previousValue === "number") {
    return element.value === "" ? 0 : Number(element.value);
  }

  return element.value;
}

function handleInput(event) {
  const control = event.target.closest("[data-path]");
  if (!control) {
    return;
  }

  const previousValue = getByPath(state, control.dataset.path);
  setByPath(state, control.dataset.path, parseInputValue(control, previousValue));
  persistState();
  render();
}

function handleClick(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) {
    return;
  }

  const action = actionNode.dataset.action;
  if (action === "load-example") {
    state = structuredClone(DEFAULT_STATE);
    persistState();
    render();
    return;
  }

  if (action === "reset-project") {
    state = structuredClone(DEFAULT_STATE);
    window.localStorage.removeItem(STORAGE_KEY);
    render();
    return;
  }

  if (action === "open-report" || action === "print-report") {
    const snapshot = runAnalysis(state);
    openReportWindow(snapshot, action === "print-report");
  }
}

function bootstrap() {
  if (!window.katex) {
    window.setTimeout(bootstrap, 30);
    return;
  }

  render();
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  document.addEventListener("click", handleClick);
}

bootstrap();
