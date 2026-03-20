import { BAR_OPTIONS } from "../data/rebar.js";
import { renderFlexureDrawing } from "../drawings/flexureDrawing.js";
import { renderSectionDrawing } from "../drawings/sectionDrawing.js";
import { renderShearDrawing } from "../drawings/shearDrawing.js";
import { equationBlock, equationInline } from "./math.js";
import { escapeHtml, formatNumber } from "../utils/format.js";

function textField(label, path, value, options = {}) {
  return `
    <label class="field ${options.wide ? "field--wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <input type="${options.type || "text"}" value="${escapeHtml(value ?? "")}" data-path="${path}">
      ${options.hint ? `<small>${escapeHtml(options.hint)}</small>` : ""}
    </label>
  `;
}

function textAreaField(label, path, value, rows = 3) {
  return `
    <label class="field field--wide">
      <span>${escapeHtml(label)}</span>
      <textarea rows="${rows}" data-path="${path}">${escapeHtml(value ?? "")}</textarea>
    </label>
  `;
}

function numberField(label, path, value, options = {}) {
  return `
    <label class="field ${options.wide ? "field--wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        step="${options.step || "0.01"}"
        min="${options.min ?? ""}"
        max="${options.max ?? ""}"
        value="${Number.isFinite(Number(value)) ? Number(value) : 0}"
        data-path="${path}"
      >
      ${options.hint ? `<small>${escapeHtml(options.hint)}</small>` : ""}
    </label>
  `;
}

function selectField(label, path, value, options, hint = "", wide = false) {
  return `
    <label class="field ${wide ? "field--wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <select data-path="${path}">
        ${options
          .map(
            (option) =>
              `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`
          )
          .join("")}
      </select>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </label>
  `;
}

function checkboxField(label, path, checked, hint = "", wide = false) {
  return `
    <label class="field field--checkbox ${wide ? "field--wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" data-path="${path}" ${checked ? "checked" : ""}>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </label>
  `;
}

function metricCard(label, value, note = "") {
  return `
    <article class="metric-card">
      <p class="metric-card__label">${escapeHtml(label)}</p>
      <div class="metric-card__value">${escapeHtml(value)}</div>
      ${note ? `<p class="metric-card__note">${escapeHtml(note)}</p>` : ""}
    </article>
  `;
}

function keyValueRows(items) {
  return items
    .map(
      ([label, value]) => `
        <div class="kv-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
    )
    .join("");
}

function messageStack(messages) {
  return messages
    .map(
      (message) => `
        <div class="message-card message-card--${message.type}">
          ${escapeHtml(message.text)}
        </div>
      `
    )
    .join("");
}

function valueTable(values = []) {
  if (!values.length) {
    return "";
  }

  return `
    <div class="kv-grid">
      ${values
        .map(
          ([label, value]) => `
            <div class="kv-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStepCards(title, steps) {
  return `
    <section class="step-column">
      <div class="panel-head panel-head--compact">
        <div>
          <p class="panel-kicker">Calculation Sequence</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      <div class="step-stack">
        ${steps
          .map(
            (step, index) => `
              <article class="step-card step-card--detail">
                <div class="step-card__index">0${index + 1}</div>
                <div class="step-card__body">
                  <h4>${escapeHtml(step.title)}</h4>
                  ${step.narrative ? `<p class="step-card__narrative">${escapeHtml(step.narrative)}</p>` : ""}
                  ${(step.equations || []).map((equation) => equationBlock(equation)).join("")}
                  ${(step.substitutions || []).map((equation) => equationBlock(equation)).join("")}
                  ${valueTable(step.values)}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderReportMetadataPreview(project) {
  const designer = project.designer || "SL";
  const checkedBy = project.checkedBy || "N/A";

  return `
    <div class="report-meta-grid">
      <article class="report-meta-card">
        <div class="report-meta-card__row">
          <span>Designer</span>
          <strong>${escapeHtml(designer)}</strong>
        </div>
        <div class="report-meta-card__row">
          <span>Date</span>
          <strong>${escapeHtml(project.date || "None")}</strong>
        </div>
      </article>
      <article class="report-meta-card">
        <div class="report-meta-card__row">
          <span>Checked By / QC</span>
          <strong>${escapeHtml(checkedBy)}</strong>
        </div>
        <div class="report-meta-card__row">
          <span>Date</span>
          <strong>${escapeHtml(project.checkedDate || project.date || "None")}</strong>
        </div>
      </article>
    </div>
  `;
}

function renderPanelSummary(summary, body) {
  return `
    <summary class="accordion-summary">
      <div class="accordion-copy">
        ${summary}
      </div>
      <span class="accordion-chevron" aria-hidden="true"></span>
    </summary>
    <div class="accordion-body">
      ${body}
    </div>
  `;
}

function logoUploader(project) {
  return `
    <div class="logo-uploader">
      <div class="logo-preview">
        ${
          project.companyLogoDataUrl
            ? `<img src="${project.companyLogoDataUrl}" alt="Company logo preview">`
            : `<span>No logo uploaded</span>`
        }
      </div>
      <div class="logo-uploader__controls">
        <label class="action-button action-button--file">
          Upload Logo
          <input type="file" accept="image/*" data-upload="company-logo" hidden>
        </label>
        ${
          project.companyLogoDataUrl
            ? `<button class="action-button" type="button" data-action="clear-logo">Clear Logo</button>`
            : ""
        }
        <small>PNG, JPG, or SVG logos are accepted. High-resolution files are scaled automatically for clean report output.</small>
      </div>
    </div>
  `;
}

function renderLayerEditor(title, groupKey, layers, spacingPath, spacingValue, layerData, emptyCopy) {
  return `
    <section class="layer-editor">
      <div class="layer-editor__header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(emptyCopy)}</p>
        </div>
        <button class="action-button action-button--small" type="button" data-action="add-layer" data-group="${groupKey}">Add Layer</button>
      </div>
      <div class="layer-editor__rows">
        ${
          layers.length
            ? layers
                .map(
                  (layer, index) => `
                    <article class="layer-row">
                      <div class="layer-row__head">
                        <div class="layer-row__title">${escapeHtml(groupKey === "bottom" ? `Bottom Layer ${index + 1}` : `Top Layer ${index + 1}`)}</div>
                        ${
                          groupKey === "top" || layers.length > 1
                            ? `<button class="action-button action-button--small action-button--danger" type="button" data-action="remove-layer" data-group="${groupKey}" data-index="${index}">Remove</button>`
                            : ""
                        }
                      </div>
                      <div class="layer-row__grid">
                        ${selectField("Bar size", `reinforcement.${groupKey}Layers.${index}.barSize`, layer.barSize, BAR_OPTIONS)}
                        ${numberField("Bar count", `reinforcement.${groupKey}Layers.${index}.barCount`, layer.barCount, { step: "1", min: "1" })}
                        <div class="layer-row__derived">
                          <span>Area</span>
                          <strong>${formatNumber(layerData[index]?.area || 0, 2)} in²</strong>
                        </div>
                        <div class="layer-row__derived">
                          <span>Depth y</span>
                          <strong>${formatNumber(layerData[index]?.depth || 0, 2)} in</strong>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<div class="empty-state">${escapeHtml(groupKey === "top" ? "No top reinforcement layers are defined yet." : "At least one bottom layer is required.")}</div>`
        }
      </div>
      <div class="layer-editor__footer">
        ${numberField("Vertical clear spacing (in)", spacingPath, spacingValue, { hint: "Measured clear between adjacent rows in the same face." })}
      </div>
    </section>
  `;
}

function renderLayerScheduleTable(title, layers) {
  return `
    <article class="subpanel layer-schedule-card">
      <div class="layer-schedule-card__header">
        <h3>${escapeHtml(title)}</h3>
        <div class="layer-schedule-head">
          <span>Layer</span>
          <span>Bars</span>
          <span>Size</span>
          <span>Area</span>
          <span>y</span>
        </div>
      </div>
      <div class="layer-schedule-table">
        ${
          layers.length
            ? layers
                .map(
                  (layer) => `
                    <div class="layer-schedule-row">
                      <div class="layer-schedule-cell">
                        <span class="layer-schedule-mobile-label">Layer</span>
                        <strong>L${layer.index + 1}</strong>
                      </div>
                      <div class="layer-schedule-cell">
                        <span class="layer-schedule-mobile-label">Bars</span>
                        <span>${layer.barCount}</span>
                      </div>
                      <div class="layer-schedule-cell">
                        <span class="layer-schedule-mobile-label">Size</span>
                        <span>${escapeHtml(layer.barSize)}</span>
                      </div>
                      <div class="layer-schedule-cell">
                        <span class="layer-schedule-mobile-label">Area</span>
                        <span>${formatNumber(layer.area, 2)} in²</span>
                      </div>
                      <div class="layer-schedule-cell">
                        <span class="layer-schedule-mobile-label">y</span>
                        <span>${formatNumber(layer.depth, 2)} in</span>
                      </div>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state">No layers</div>`
        }
      </div>
    </article>
  `;
}

export function renderApp(snapshot) {
  const { state, geometry, reinforcement, flexure, shear } = snapshot;
  const overallStatus = snapshot.messages.some((message) => message.type === "error")
    ? "Needs Review"
    : snapshot.messages.some((message) => message.type === "warning")
      ? "Review Warnings"
      : "Ready";

  return `
    <div class="page-shell">
      <header class="hero">
        <div class="hero__intro">
          <p class="eyebrow">Bridge Superstructure Capacity Studio</p>
          <h1>TBeam</h1>
          <p class="hero__copy">
            Cast-in-place reinforced concrete T-beam flexural and shear capacity workspace with multi-layer reinforcement,
            strain-compatibility calculations, live engineering drawings, and a branded printable report package.
          </p>
        </div>
        <div class="hero__actions">
          <button class="action-button action-button--primary" data-action="load-example">Load Example Beam</button>
          <button class="action-button" data-action="open-report">Open Report</button>
          <button class="action-button" data-action="save-report">Save Report</button>
          <button class="action-button" data-action="save-json">Save JSON</button>
          <label class="action-button action-button--file">
            Load JSON
            <input type="file" accept=".json,application/json" data-upload="session-json" hidden>
          </label>
          <button class="action-button" data-action="print-report">Print / PDF</button>
          <button class="action-button" data-action="reset-project">Reset Inputs</button>
        </div>
        <div class="hero__status">
          ${metricCard("Overall status", overallStatus, "Live autosave is enabled in this browser.")}
          ${metricCard("Design moment", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`, "phiMn")}
          ${metricCard("Design shear", `${formatNumber(shear.phiVn, 1)} k`, "phiVn")}
          ${metricCard("Section behavior", flexure.sectionCase === "flange" ? "Flange compression block" : "Flange + web compression", `d = ${formatNumber(geometry.d, 2)} in`)}
        </div>
      </header>

      <nav class="workflow-nav" aria-label="Workflow sections">
        <a href="#section-figure">Section Figure</a>
        <a href="#flexural-capacity">Flexure</a>
        <a href="#shear-capacity">Shear</a>
        <a href="#engineering-diagrams">Diagrams</a>
        <a href="#calculations">Calculations</a>
        <a href="#report-panel">Report</a>
      </nav>

      <div class="top-workflow-grid">
        <section class="top-input-stack top-input-stack--primary">
          <details class="panel accordion-panel" data-panel-id="setup" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">01 Section Setup</p><h2>Project and report branding</h2><p>Title block, company name, and logo used in the report package.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${textField("Project name", "project.name", state.project.name)}
                  ${textField("Designer", "project.designer", state.project.designer)}
                  ${textField("Checked by / QCer", "project.checkedBy", state.project.checkedBy)}
                  ${textField("QC date", "project.checkedDate", state.project.checkedDate, { type: "date" })}
                  ${textField("Company name", "project.companyName", state.project.companyName)}
                  ${textField("Date", "project.date", state.project.date, { type: "date" })}
                  ${textAreaField("Design notes", "project.notes", state.project.notes, 4)}
                </div>
                ${logoUploader(state.project)}
              `
            )}
          </details>

          <details class="panel accordion-panel" data-panel-id="geometry" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">02 Geometry Inputs</p><h2>T-beam section definition</h2><p>Core flange, web, cover, and effective-depth controls.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${numberField("Flange width bf (in)", "geometry.bf", state.geometry.bf)}
                  ${numberField("Flange thickness hf (in)", "geometry.hf", state.geometry.hf)}
                  ${numberField("Web width bw (in)", "geometry.bw", state.geometry.bw)}
                  ${numberField("Total depth h (in)", "geometry.h", state.geometry.h)}
                  ${numberField("Concrete cover (in)", "geometry.cover", state.geometry.cover)}
                  ${checkboxField("Manual effective depth override", "geometry.manualEffectiveDepth", state.geometry.manualEffectiveDepth, "Use only when you want to override the layer-derived d value.", true)}
                  ${
                    state.geometry.manualEffectiveDepth
                      ? numberField("Effective depth d (in)", "geometry.effectiveDepthOverride", state.geometry.effectiveDepthOverride, { hint: "Override used directly in analysis." })
                      : ""
                  }
                </div>
                <div class="derived-strip">
                  ${metricCard("Auto d", `${formatNumber(reinforcement.effectiveDepthAuto, 2)} in`, "Tension steel centroid")}
                  ${metricCard("Top steel d'", `${formatNumber(geometry.dPrime, 2)} in`, "Top layer centroid")}
                  ${metricCard("Neutral axis c", `${formatNumber(flexure.c, 2)} in`, "Derived")}
                  ${metricCard("Compression block a", `${formatNumber(flexure.a, 2)} in`, "Derived")}
                </div>
              `
            )}
          </details>
        </section>

        <section class="top-input-stack top-input-stack--secondary">
          <details class="panel accordion-panel" data-panel-id="materials" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">03 Material Inputs</p><h2>Concrete and reinforcing steel</h2><p>Material properties used throughout flexure, shear, drawings, and report generation.</p>`,
              `
                <div class="field-grid field-grid--three">
                  ${numberField("Concrete strength f'c (ksi)", "materials.fc", state.materials.fc)}
                  ${numberField("Steel yield fy (ksi)", "materials.fy", state.materials.fy)}
                  ${numberField("Steel modulus Es (ksi)", "materials.es", state.materials.es, { step: "1" })}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel" data-panel-id="reinforcement" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">04 Reinforcement Inputs</p><h2>Layer-based reinforcement model</h2><p>Multiple top and bottom rows are supported and used directly in the drawings and strain-compatibility solver.</p>`,
              `
                <div class="layer-editor-stack">
                  ${renderLayerEditor(
                    "Bottom reinforcement layers",
                    "bottom",
                    state.reinforcement.bottomLayers,
                    "reinforcement.bottomLayerSpacing",
                    state.reinforcement.bottomLayerSpacing,
                    reinforcement.bottomLayers,
                    "Layer order is from the soffit upward."
                  )}
                  ${renderLayerEditor(
                    "Top reinforcement layers",
                    "top",
                    state.reinforcement.topLayers,
                    "reinforcement.topLayerSpacing",
                    state.reinforcement.topLayerSpacing,
                    reinforcement.topLayers,
                    "Layer order is from the top face downward."
                  )}
                  <section class="layer-editor">
                    <div class="layer-editor__header">
                      <div>
                        <h3>Transverse reinforcement</h3>
                        <p>Stirrups and LRFD shear input used for the beam elevation and shear calculations.</p>
                      </div>
                    </div>
                    <div class="field-grid field-grid--three">
                      ${selectField("Stirrup bar size", "reinforcement.stirrupBarSize", state.reinforcement.stirrupBarSize, BAR_OPTIONS)}
                      ${numberField("Stirrup legs", "reinforcement.stirrupLegs", state.reinforcement.stirrupLegs, { step: "1", min: "0" })}
                      ${numberField("Stirrup spacing s (in)", "reinforcement.stirrupSpacing", state.reinforcement.stirrupSpacing)}
                    </div>
                    <div class="field-grid field-grid--three">
                      ${numberField("Edge zone spacing (in)", "reinforcement.edgeStirrupSpacing", state.reinforcement.edgeStirrupSpacing)}
                      ${numberField("Middle zone spacing (in)", "reinforcement.middleStirrupSpacing", state.reinforcement.middleStirrupSpacing)}
                      ${numberField("Edge zone length (in)", "reinforcement.edgeZoneLength", state.reinforcement.edgeZoneLength)}
                    </div>
                    <div class="equation-note">Edge and middle stirrup spacing affect only the shear elevation figure. Shear capacity continues to use the single design spacing ${formatNumber(state.reinforcement.stirrupSpacing, 2)} in.</div>
                  </section>
                </div>
                <div class="derived-strip derived-strip--tall">
                  ${metricCard("Bottom steel As", `${formatNumber(reinforcement.tensionArea, 2)} in²`, `${reinforcement.totalBottomBars} total bars`)}
                  ${metricCard("Top steel As'", `${formatNumber(reinforcement.compressionArea, 2)} in²`, `${reinforcement.totalTopBars} total bars`)}
                  ${metricCard("Stirrup area Av", `${formatNumber(reinforcement.shearArea, 2)} in²`, `${state.reinforcement.stirrupLegs} legs`)}
                  ${metricCard("Stirrup diameter", `${formatNumber(reinforcement.stirrupBar.diameter, 3)} in`, "From selected stirrup size")}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel" data-panel-id="shear-assumptions">
            ${renderPanelSummary(
              `<p class="panel-kicker">05 Shear Assumptions</p><h2>AASHTO beta and theta</h2><p>Editable LRFD parameters for capacity-oriented shear evaluation.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${numberField("Beta", "reinforcement.shearBeta", state.reinforcement.shearBeta)}
                  ${numberField("Theta (deg)", "reinforcement.shearThetaDeg", state.reinforcement.shearThetaDeg)}
                </div>
                <div class="equation-note">
                  ${equationInline("V_c = 0.0316\\beta\\sqrt{f'_c}b_wd_v")} and ${equationInline("V_s = \\frac{A_vf_yd_v\\cot\\theta}{s}")}.
                  ${escapeHtml(shear.assumptionNote)}
                </div>
              `
            )}
          </details>
        </section>

        <section class="top-figure-column">
          <article class="panel figure-panel" id="section-figure">
            <div class="panel-head panel-head--compact">
              <div>
                <p class="panel-kicker panel-kicker--quiet">Engineering Figure</p>
                <h2>Main T-Beam Section</h2>
                <p class="panel-caption">Live parametric section figure tied to the current geometry, bar layers, and solved flexural depths.</p>
              </div>
            </div>
            ${renderSectionDrawing(snapshot)}
            <div class="layer-schedule-grid">
              ${renderLayerScheduleTable("Bottom layers", reinforcement.bottomLayers)}
              ${renderLayerScheduleTable("Top layers", reinforcement.topLayers)}
            </div>
          </article>

          <section class="dashboard-grid" id="design-summary">
            <article class="panel">
              <div class="panel-head panel-head--compact">
                <div>
                  <p class="panel-kicker">Design Summary</p>
                  <h2>Capacity snapshot</h2>
                </div>
              </div>
              <div class="metric-grid">
                ${metricCard("Nominal moment Mn", `${formatNumber(flexure.mnKipFt, 1)} k-ft`, "Unfactored")}
                ${metricCard("Design moment phiMn", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`, flexure.tensionControlled ? "Tension-controlled" : "Check strain state")}
                ${metricCard("Nominal shear Vn", `${formatNumber(shear.vn, 1)} k`, shear.controlsLimit ? "Limited by 0.25 f'c bw dv" : "Vc + Vs governs")}
                ${metricCard("Design shear phiVn", `${formatNumber(shear.phiVn, 1)} k`, `dv = ${formatNumber(shear.dv, 2)} in`)}
              </div>
            </article>

            <article class="panel">
              <div class="panel-head panel-head--compact">
                <div>
                  <p class="panel-kicker">Validation</p>
                  <h2>Coordination and assumptions</h2>
                </div>
              </div>
              <div class="message-stack">${messageStack(snapshot.messages)}</div>
              <div class="assumption-list">
                ${snapshot.assumptions
                  .map((assumption) => `<div class="assumption-pill">${escapeHtml(assumption)}</div>`)
                  .join("")}
              </div>
            </article>
          </section>
        </section>
      </div>

      <main class="workspace">
        <details class="panel workspace-panel" data-panel-id="flexural-capacity" open id="flexural-capacity">
          ${renderPanelSummary(
            `<p class="panel-kicker">06 Flexural Capacity</p><h2>Strain compatibility and moment resistance</h2><p>Layer-by-layer steel response, compression-block case, and nominal/design moment capacity.</p>`,
            `
              <div class="analysis-grid">
                <section class="subpanel">
                  <div class="metric-grid">
                    ${metricCard("a", `${formatNumber(flexure.a, 2)} in`, flexure.sectionCase === "flange" ? "Compression remains in flange" : "Compression extends into web")}
                    ${metricCard("c", `${formatNumber(flexure.c, 2)} in`, "Neutral axis depth")}
                    ${metricCard("T", `${formatNumber(flexure.totalTension, 1)} k`, `yT = ${formatNumber(flexure.tensionResultantDepth, 2)} in`)}
                    ${metricCard("z", `${formatNumber(flexure.leverArm, 2)} in`, "Resultant lever arm")}
                  </div>
                  <div class="equation-stack">
                    ${equationBlock("A_s = \\sum_i n_iA_{b,i}")}
                    ${equationBlock("a = \\beta_1 c")}
                    ${equationBlock(
                      flexure.sectionCase === "flange"
                        ? "C_c = 0.85f'_c b_f a"
                        : "C_c = 0.85f'_c\\left[b_w a + (b_f - b_w)h_f\\right]"
                    )}
                    ${equationBlock("M_n = Tz")}
                  </div>
                </section>
                <section class="subpanel">
                  <div class="kv-grid">
                    ${keyValueRows([
                      ["Bottom steel area As", `${formatNumber(reinforcement.tensionArea, 2)} in²`],
                      ["Top steel area As'", `${formatNumber(reinforcement.compressionArea, 2)} in²`],
                      ["Automatic effective depth d", `${formatNumber(geometry.d, 2)} in`],
                      ["Top steel depth d'", `${formatNumber(geometry.dPrime, 2)} in`],
                      ["Compression block case", flexure.sectionCase === "flange" ? "Within flange" : "Extends into web"],
                      ["Maximum tension strain", `${formatNumber(flexure.maxTensionStrain, 5)}`],
                      ["Design moment phiMn", `${formatNumber(flexure.phiMnKipFt, 2)} k-ft`]
                    ])}
                  </div>
                </section>
              </div>
            `
          )}
        </details>

        <details class="panel workspace-panel" data-panel-id="shear-capacity" open id="shear-capacity">
          ${renderPanelSummary(
            `<p class="panel-kicker">07 Shear Capacity</p><h2>Concrete and stirrup resistance</h2><p>Concrete contribution, stirrup contribution, LRFD limit checks, and design shear capacity.</p>`,
            `
              <div class="analysis-grid">
                <section class="subpanel">
                  <div class="metric-grid">
                    ${metricCard("Vc", `${formatNumber(shear.vc, 2)} k`, "Concrete contribution")}
                    ${metricCard("Vs", `${formatNumber(shear.vs, 2)} k`, "Stirrup contribution")}
                    ${metricCard("Vn", `${formatNumber(shear.vn, 2)} k`, shear.controlsLimit ? "Limited by 0.25 f'c bw dv" : "Vc + Vs")}
                    ${metricCard("phiVn", `${formatNumber(shear.phiVn, 2)} k`, "Design shear capacity")}
                  </div>
                  <div class="equation-stack">
                    ${equationBlock("d_v = \\max\\left(d - \\frac{a}{2},\\ 0.9d,\\ 0.72h\\right)")}
                    ${equationBlock("V_c = 0.0316\\beta\\sqrt{f'_c}b_wd_v")}
                    ${equationBlock("V_s = \\frac{A_vf_yd_v\\cot\\theta}{s}")}
                    ${equationBlock("\\phi V_n = 0.90\\min\\left(V_c + V_s,\\ 0.25f'_c b_w d_v\\right)")}
                  </div>
                </section>
                <section class="subpanel">
                  <div class="kv-grid">
                    ${keyValueRows([
                      ["Effective shear depth dv", `${formatNumber(shear.dv, 2)} in`],
                      ["Stirrup area Av", `${formatNumber(reinforcement.shearArea, 2)} in²`],
                      ["Stirrup spacing s", `${formatNumber(state.reinforcement.stirrupSpacing, 2)} in`],
                      ["Beta", `${formatNumber(shear.beta, 2)}`],
                      ["Theta", `${formatNumber(shear.thetaDeg, 1)} deg`],
                      ["Design shear phiVn", `${formatNumber(shear.phiVn, 2)} k`]
                    ])}
                  </div>
                </section>
              </div>
            `
          )}
        </details>

        <details class="panel workspace-panel" data-panel-id="engineering-diagrams" open id="engineering-diagrams">
          ${renderPanelSummary(
            `<p class="panel-kicker">08 Engineering Diagrams</p><h2>Flexure and shear detail figures</h2><p>Textbook-style diagrams tied directly to the member geometry and calculation outputs.</p>`,
            `
              <div class="drawing-grid">
                <article class="drawing-card">
                  <h3>Flexural strain compatibility diagram</h3>
                  ${renderFlexureDrawing(snapshot)}
                </article>
                <article class="drawing-card">
                  <h3>Shear reinforcement elevation</h3>
                  ${renderShearDrawing(snapshot)}
                </article>
              </div>
            `
          )}
        </details>

        <details class="panel workspace-panel" data-panel-id="calculations" open id="calculations">
          ${renderPanelSummary(
            `<p class="panel-kicker">09 Step-by-Step Calculations</p><h2>Governing equations, substitutions, and intermediate values</h2><p>Every major design stage is shown explicitly with professional equation rendering.</p>`,
            `
              <div class="steps-grid">
                ${renderStepCards("Flexural capacity", flexure.steps)}
                ${renderStepCards("Shear capacity", shear.steps)}
              </div>
            `
          )}
        </details>

        <details class="panel workspace-panel" data-panel-id="report-panel" open id="report-panel">
          ${renderPanelSummary(
            `<p class="panel-kicker">10 Report</p><h2>Open, save, and print the engineering package</h2><p>The report is a standalone branded calculation package with drawings, equations, summaries, and your uploaded logo.</p>`,
            `
              <div class="report-preview-grid">
                <article class="subpanel">
                  <h3>Report actions</h3>
                  <div class="report-outline">
                    <div>Open a live report window for on-screen review</div>
                    <div>Save a standalone HTML calculation package</div>
                    <div>Save or restore a JSON session package with inputs and key outputs</div>
                    <div>Print directly to PDF with the report title block and logo</div>
                    <div>Include section figure, flexural/shear diagrams, and full calculations</div>
                  </div>
                  <div class="report-actions">
                    <button class="action-button action-button--primary" data-action="open-report">Open Report</button>
                    <button class="action-button" data-action="save-report">Save Report</button>
                    <button class="action-button" data-action="save-json">Save JSON</button>
                    <label class="action-button action-button--file">
                      Load JSON
                      <input type="file" accept=".json,application/json" data-upload="session-json" hidden>
                    </label>
                    <button class="action-button" data-action="print-report">Print / PDF</button>
                  </div>
                </article>
                <article class="subpanel">
                  <h3>Report title block</h3>
                  ${renderReportMetadataPreview(state.project)}
                  <div class="kv-grid">
                    ${keyValueRows([
                      ["Project", state.project.name],
                      ["Company", state.project.companyName || "None"],
                      ["Logo", state.project.companyLogoDataUrl ? "Included in report header" : "Not uploaded"],
                      ["Notes", state.project.notes || "None"]
                    ])}
                  </div>
                </article>
              </div>
            `
          )}
        </details>
      </main>
    </div>
  `;
}
