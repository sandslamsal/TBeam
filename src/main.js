import { runAnalysis } from "./analysis/runAnalysis.js";
import { downloadReportFile, openReportWindow } from "./report/reportBuilder.js";
import { DEFAULT_STATE, STORAGE_KEY } from "./state/defaults.js";
import { normalizeState } from "./state/normalize.js";
import { renderApp } from "./ui/render.js";
import { downloadTextFile, getByPath, setByPath, slugify } from "./utils/format.js";

const app = document.getElementById("app");

let state = loadState();

function buildSessionExport(snapshot) {
  return {
    schema: "tbeam-session",
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      name: snapshot.state.project.name,
      designer: snapshot.state.project.designer,
      checkedBy: snapshot.state.project.checkedBy,
      companyName: snapshot.state.project.companyName
    },
    state: snapshot.state,
    outputs: {
      summary: {
        sectionCase: snapshot.flexure.sectionCase,
        phiMnKipFt: snapshot.flexure.phiMnKipFt,
        phiVn: snapshot.shear.phiVn,
        tensionControlled: snapshot.flexure.tensionControlled,
        shearControlsLimit: snapshot.shear.controlsLimit
      },
      geometry: {
        bf: snapshot.geometry.bf,
        hf: snapshot.geometry.hf,
        bw: snapshot.geometry.bw,
        h: snapshot.geometry.h,
        d: snapshot.geometry.d,
        dPrime: snapshot.geometry.dPrime,
        c: snapshot.flexure.c,
        a: snapshot.flexure.a
      },
      reinforcement: {
        tensionArea: snapshot.reinforcement.tensionArea,
        compressionArea: snapshot.reinforcement.compressionArea,
        shearArea: snapshot.reinforcement.shearArea,
        totalBottomBars: snapshot.reinforcement.totalBottomBars,
        totalTopBars: snapshot.reinforcement.totalTopBars
      },
      flexure: {
        mnKipFt: snapshot.flexure.mnKipFt,
        phiMnKipFt: snapshot.flexure.phiMnKipFt,
        totalCompression: snapshot.flexure.totalCompression,
        totalTension: snapshot.flexure.totalTension,
        leverArm: snapshot.flexure.leverArm,
        maxTensionStrain: snapshot.flexure.maxTensionStrain
      },
      shear: {
        vc: snapshot.shear.vc,
        vs: snapshot.shear.vs,
        vn: snapshot.shear.vn,
        phiVn: snapshot.shear.phiVn,
        dv: snapshot.shear.dv,
        beta: snapshot.shear.beta,
        thetaDeg: snapshot.shear.thetaDeg
      },
      messages: snapshot.messages,
      assumptions: snapshot.assumptions
    }
  };
}

function extractImportedState(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (payload.state && typeof payload.state === "object" && !Array.isArray(payload.state)) {
    return payload.state;
  }

  if (payload.project || payload.geometry || payload.materials || payload.reinforcement) {
    return payload;
  }

  return null;
}

function captureViewState() {
  const activeElement = document.activeElement;
  const activeField =
    activeElement instanceof HTMLElement ? activeElement.closest("[data-path]") : null;

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    activePath: activeField?.dataset.path ?? "",
    selectionStart:
      activeField instanceof HTMLInputElement || activeField instanceof HTMLTextAreaElement
        ? activeField.selectionStart
        : null,
    selectionEnd:
      activeField instanceof HTMLInputElement || activeField instanceof HTMLTextAreaElement
        ? activeField.selectionEnd
        : null,
    openPanels: Object.fromEntries(
      Array.from(document.querySelectorAll("details[data-panel-id]")).map((panel) => [
        panel.dataset.panelId,
        panel.open
      ])
    )
  };
}

function restoreViewState(viewState) {
  if (!viewState) {
    return;
  }

  Object.entries(viewState.openPanels || {}).forEach(([panelId, open]) => {
    const panel = document.querySelector(`details[data-panel-id="${panelId}"]`);
    if (panel) {
      panel.open = open;
    }
  });

  if (viewState.activePath) {
    const nextField = document.querySelector(`[data-path="${CSS.escape(viewState.activePath)}"]`);
    if (nextField instanceof HTMLElement) {
      nextField.focus({ preventScroll: true });
      if (
        (nextField instanceof HTMLInputElement || nextField instanceof HTMLTextAreaElement) &&
        viewState.selectionStart != null &&
        viewState.selectionEnd != null
      ) {
        try {
          nextField.setSelectionRange(viewState.selectionStart, viewState.selectionEnd);
        } catch {
          // Some date/number inputs do not support programmatic selection ranges.
        }
      }
    }
  }

  window.requestAnimationFrame(() => {
    window.scrollTo(viewState.scrollX, viewState.scrollY);
  });
}

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
  const viewState = captureViewState();
  state = normalizeState(state);
  const snapshot = runAnalysis(state);
  app.innerHTML = renderApp(snapshot);
  restoreViewState(viewState);
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
  const input = event.target.closest("[data-upload]");
  if (!input || !input.files?.length) {
    return;
  }

  try {
    if (input.dataset.upload === "company-logo") {
      state.project.companyLogoDataUrl = await readLogoDataUrl(input.files[0]);
      state.project.companyLogoFilename = input.files[0].name;
      persistAndRender();
      return;
    }

    if (input.dataset.upload === "session-json") {
      const payload = JSON.parse(await input.files[0].text());
      const importedState = extractImportedState(payload);

      if (!importedState) {
        throw new Error("Invalid TBeam JSON payload.");
      }

      state = normalizeState(structuredClone(importedState));
      persistAndRender();
    }
  } catch (error) {
    window.alert(
      input.dataset.upload === "session-json"
        ? "Unable to load the JSON session. Use a TBeam JSON export or a valid state object."
        : "Unable to process the uploaded file."
    );
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

  if (action === "open-report" || action === "print-report" || action === "save-report" || action === "save-json") {
    const snapshot = runAnalysis(state);

    if (action === "open-report") {
      openReportWindow(snapshot, false);
      return;
    }

    if (action === "print-report") {
      openReportWindow(snapshot, true);
      return;
    }

    if (action === "save-json") {
      const fileName = `${slugify(snapshot.state.project.name || "tbeam-session")}.json`;
      downloadTextFile(fileName, JSON.stringify(buildSessionExport(snapshot), null, 2), "application/json;charset=utf-8");
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
  document.addEventListener("change", handleInput);
  document.addEventListener("change", handleUpload);
  document.addEventListener("click", handleClick);
}

bootstrap();
