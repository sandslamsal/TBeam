import { runAnalysis } from "./analysis/runAnalysis.js";
import { downloadReportFile, openReportWindow } from "./report/reportBuilder.js";
import { DEFAULT_STATE, STORAGE_KEY } from "./state/defaults.js";
import { normalizeState } from "./state/normalize.js";
import { renderApp } from "./ui/render.js";
import { getByPath, setByPath } from "./utils/format.js";

const app = document.getElementById("app");

let state = loadState();

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return normalizeState(structuredClone(DEFAULT_STATE));
    }

    return normalizeState(deepMerge(structuredClone(DEFAULT_STATE), JSON.parse(saved)));
  } catch {
    return normalizeState(structuredClone(DEFAULT_STATE));
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

function persistAndRender() {
  state = normalizeState(state);
  persistState();
  render();
}

function render() {
  state = normalizeState(state);
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

function createLayer(group) {
  return group === "bottom"
    ? { barSize: "#9", barCount: 3 }
    : { barSize: "#6", barCount: 2 };
}

function handleStateInput(control) {
  const previousValue = getByPath(state, control.dataset.path);
  setByPath(state, control.dataset.path, parseInputValue(control, previousValue));
  persistAndRender();
}

function readLogoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 360;
        const maxHeight = 140;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleUpload(event) {
  const input = event.target.closest("[data-upload='company-logo']");
  if (!input || !input.files?.length) {
    return;
  }

  try {
    state.project.companyLogoDataUrl = await readLogoDataUrl(input.files[0]);
    state.project.companyLogoFilename = input.files[0].name;
    persistAndRender();
  } finally {
    input.value = "";
  }
}

function handleInput(event) {
  const uploadInput = event.target.closest("[data-upload]");
  if (uploadInput) {
    return;
  }

  const control = event.target.closest("[data-path]");
  if (!control) {
    return;
  }

  handleStateInput(control);
}

function handleClick(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) {
    return;
  }

  const action = actionNode.dataset.action;

  if (action === "load-example") {
    state = normalizeState(structuredClone(DEFAULT_STATE));
    persistAndRender();
    return;
  }

  if (action === "reset-project") {
    state = normalizeState(structuredClone(DEFAULT_STATE));
    window.localStorage.removeItem(STORAGE_KEY);
    render();
    return;
  }

  if (action === "open-report" || action === "print-report" || action === "save-report") {
    const snapshot = runAnalysis(state);

    if (action === "open-report") {
      openReportWindow(snapshot, false);
      return;
    }

    if (action === "print-report") {
      openReportWindow(snapshot, true);
      return;
    }

    downloadReportFile(snapshot);
    return;
  }

  if (action === "clear-logo") {
    state.project.companyLogoDataUrl = "";
    state.project.companyLogoFilename = "";
    persistAndRender();
    return;
  }

  if (action === "add-layer") {
    const group = actionNode.dataset.group;
    state.reinforcement[`${group}Layers`] = [
      ...state.reinforcement[`${group}Layers`],
      createLayer(group)
    ];
    persistAndRender();
    return;
  }

  if (action === "remove-layer") {
    const group = actionNode.dataset.group;
    const index = Number(actionNode.dataset.index);
    const layers = [...state.reinforcement[`${group}Layers`]];
    if (group === "bottom" && layers.length <= 1) {
      return;
    }
    layers.splice(index, 1);
    state.reinforcement[`${group}Layers`] = layers;
    persistAndRender();
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
  document.addEventListener("change", handleUpload);
  document.addEventListener("click", handleClick);
}

bootstrap();
