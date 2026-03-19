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

function selectField(label, path, value, options, hint = "") {
  return `
    <label class="field">
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

function checkboxField(label, path, checked, hint = "") {
  return `
    <label class="field field--checkbox">
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
              <article class="step-card">
                <div class="step-card__index">0${index + 1}</div>
                <div class="step-card__body">
                  <h4>${escapeHtml(step.title)}</h4>
                  ${equationBlock(step.equation)}
                  ${equationBlock(step.detail)}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
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
            Interactive cast-in-place reinforced concrete T-beam design workspace for AASHTO LRFD 9th Edition flexural and shear capacity,
            with live drawings, calculation narratives, LaTeX equations, and a print-ready engineering report.
          </p>
        </div>
        <div class="hero__actions">
          <button class="action-button action-button--primary" data-action="load-example">Load Example Beam</button>
          <button class="action-button" data-action="open-report">Open Report</button>
          <button class="action-button" data-action="print-report">Print / Save PDF</button>
          <button class="action-button" data-action="reset-project">Reset Inputs</button>
        </div>
        <div class="hero__status">
          ${metricCard("Overall status", overallStatus, "Live autosave is enabled in this browser.")}
          ${metricCard("Design moment", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`, "phiMn")}
          ${metricCard("Design shear", `${formatNumber(shear.phiVn, 1)} k`, "phiVn")}
          ${metricCard("Section behavior", flexure.sectionCase === "flange" ? "Flange compression block" : "Web compression block", `d = ${formatNumber(geometry.d, 2)} in`)}
        </div>
      </header>

      <nav class="workflow-nav" aria-label="Workflow sections">
        <a href="#design-summary">Summary</a>
        <a href="#flexural-capacity">Flexure</a>
        <a href="#shear-capacity">Shear</a>
        <a href="#drawings">Drawings</a>
        <a href="#calculations">Calculations</a>
        <a href="#report-panel">Report</a>
      </nav>

      <div class="app-grid">
        <aside class="sidebar">
          <details class="panel accordion-panel" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">01 Section Setup</p><h2>Project metadata and report header</h2><p>Define the title block used throughout the printable package.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${textField("Project name", "project.name", state.project.name)}
                  ${textField("Designer", "project.designer", state.project.designer)}
                  ${textField("Date", "project.date", state.project.date, { type: "date" })}
                  ${textAreaField("Design notes", "project.notes", state.project.notes, 4)}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">02 Geometry Inputs</p><h2>T-beam section geometry</h2><p>Flange, web, cover, and effective depth controls.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${numberField("Flange width bf (in)", "geometry.bf", state.geometry.bf)}
                  ${numberField("Flange thickness hf (in)", "geometry.hf", state.geometry.hf)}
                  ${numberField("Web width bw (in)", "geometry.bw", state.geometry.bw)}
                  ${numberField("Total depth h (in)", "geometry.h", state.geometry.h)}
                  ${numberField("Concrete cover (in)", "geometry.cover", state.geometry.cover)}
                  ${numberField("Layer spacing clear (in)", "geometry.layerSpacing", state.geometry.layerSpacing)}
                  ${checkboxField("Manual effective depth override", "geometry.manualEffectiveDepth", state.geometry.manualEffectiveDepth, "Leave unchecked to auto-compute d from reinforcement placement.")}
                  ${
                    state.geometry.manualEffectiveDepth
                      ? numberField("Effective depth d (in)", "geometry.effectiveDepthOverride", state.geometry.effectiveDepthOverride, { hint: "Override used for design calculations." })
                      : ""
                  }
                </div>
                <div class="derived-strip">
                  ${metricCard("Auto d", `${formatNumber(reinforcement.effectiveDepthAuto, 2)} in`, "From cover and layer geometry")}
                  ${metricCard("Neutral axis c", `${formatNumber(flexure.c, 2)} in`, "Derived")}
                  ${metricCard("Compression block a", `${formatNumber(flexure.a, 2)} in`, "Derived")}
                  ${metricCard("Gross area", `${formatNumber(geometry.grossArea, 0)} in²`, "Section property")}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">03 Material Inputs</p><h2>Concrete and reinforcing steel</h2><p>Default values are aligned with common bridge applications.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${numberField("Concrete strength f'c (ksi)", "materials.fc", state.materials.fc)}
                  ${numberField("Steel yield fy (ksi)", "materials.fy", state.materials.fy)}
                  ${numberField("Steel modulus Es (ksi)", "materials.es", state.materials.es, { step: "1" })}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel" open>
            ${renderPanelSummary(
              `<p class="panel-kicker">04 Reinforcement Inputs</p><h2>Longitudinal and transverse steel</h2><p>Areas, diameters, and effective depths update automatically.</p>`,
              `
                <div class="field-grid field-grid--two">
                  ${selectField("Tension bar size", "reinforcement.tensionBarSize", state.reinforcement.tensionBarSize, BAR_OPTIONS)}
                  ${numberField("Number of tension bars", "reinforcement.tensionBarCount", state.reinforcement.tensionBarCount, { step: "1", min: "1" })}
                  ${numberField("Tension layers", "reinforcement.tensionLayers", state.reinforcement.tensionLayers, { step: "1", min: "1" })}
                  ${checkboxField("Include compression steel", "reinforcement.compressionEnabled", state.reinforcement.compressionEnabled)}
                  ${
                    state.reinforcement.compressionEnabled
                      ? `
                          ${selectField("Compression bar size", "reinforcement.compressionBarSize", state.reinforcement.compressionBarSize, BAR_OPTIONS)}
                          ${numberField("Compression bar count", "reinforcement.compressionBarCount", state.reinforcement.compressionBarCount, { step: "1", min: "0" })}
                        `
                      : ""
                  }
                  ${selectField("Stirrup bar size", "reinforcement.stirrupBarSize", state.reinforcement.stirrupBarSize, BAR_OPTIONS)}
                  ${numberField("Stirrup legs", "reinforcement.stirrupLegs", state.reinforcement.stirrupLegs, { step: "1", min: "0" })}
                  ${numberField("Stirrup spacing s (in)", "reinforcement.stirrupSpacing", state.reinforcement.stirrupSpacing)}
                </div>
                <div class="derived-strip">
                  ${metricCard("Tension steel As", `${formatNumber(reinforcement.tensionArea, 2)} in²`, `${state.reinforcement.tensionBarCount} ${state.reinforcement.tensionBarSize}`)}
                  ${metricCard("Compression steel As'", `${formatNumber(reinforcement.compressionArea, 2)} in²`, state.reinforcement.compressionEnabled ? `${state.reinforcement.compressionBarCount} ${state.reinforcement.compressionBarSize}` : "Disabled")}
                  ${metricCard("Stirrup area Av", `${formatNumber(reinforcement.shearArea, 2)} in²`, `${state.reinforcement.stirrupLegs} legs`)}
                  ${metricCard("Bar diameters", `${formatNumber(reinforcement.tensionBar.diameter, 3)} / ${formatNumber(reinforcement.stirrupBar.diameter, 3)} in`, "Longitudinal / stirrup")}
                </div>
              `
            )}
          </details>

          <details class="panel accordion-panel">
            ${renderPanelSummary(
              `<p class="panel-kicker">05 Shear Assumptions</p><h2>AASHTO beta and theta</h2><p>Editable parameters for capacity-oriented shear evaluation.</p>`,
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
        </aside>

        <main class="workspace">
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
                ${metricCard("Nominal shear Vn", `${formatNumber(shear.vn, 1)} k`, shear.controlsLimit ? "Limited by 0.25 f'c bwdv" : "Vc + Vs governs")}
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

          <details class="panel workspace-panel" open id="flexural-capacity">
            ${renderPanelSummary(
              `<p class="panel-kicker">Flexural Capacity</p><h2>Positive flexure per AASHTO LRFD</h2><p>Whitney stress block, neutral axis solution, and internal lever arm.</p>`,
              `
                <div class="analysis-grid">
                  <section class="subpanel">
                    <div class="metric-grid">
                      ${metricCard("a", `${formatNumber(flexure.a, 2)} in`, flexure.sectionCase === "flange" ? "Compression stays in flange" : "Compression extends into web")}
                      ${metricCard("c", `${formatNumber(flexure.c, 2)} in`, "Neutral axis depth")}
                      ${metricCard("T", `${formatNumber(flexure.tensionForce, 1)} k`, `fs = ${formatNumber(flexure.tensionStress, 1)} ksi`)}
                      ${metricCard("z", `${formatNumber(flexure.leverArm, 2)} in`, "Internal lever arm")}
                    </div>
                    <div class="equation-stack">
                      ${equationBlock("T = A_s f_s")}
                      ${equationBlock(
                        flexure.sectionCase === "flange"
                          ? "C = 0.85 f'_c b_f a + C'_s"
                          : "C = 0.85 f'_c[b_w a + (b_f - b_w)h_f] + C'_s"
                      )}
                      ${equationBlock("M_n = \\sum C_i(d - y_i)")}
                    </div>
                  </section>
                  <section class="subpanel">
                    <div class="kv-grid">
                      ${keyValueRows([
                        ["Compression block regime", flexure.sectionCase === "flange" ? "Within flange" : "Extends into web"],
                        ["Tension strain", formatNumber(flexure.tensionStrain, 5)],
                        ["Compression steel stress", `${formatNumber(flexure.compressionStress, 1)} ksi`],
                        ["Compression steel force", `${formatNumber(flexure.compressionSteelForce, 1)} k`],
                        ["Nominal moment Mn", `${formatNumber(flexure.mnKipFt, 1)} k-ft`],
                        ["Design moment phiMn", `${formatNumber(flexure.phiMnKipFt, 1)} k-ft`]
                      ])}
                    </div>
                  </section>
                </div>
              `
            )}
          </details>

          <details class="panel workspace-panel" open id="shear-capacity">
            ${renderPanelSummary(
              `<p class="panel-kicker">Shear Capacity</p><h2>Concrete and stirrup resistance</h2><p>AASHTO LRFD shear evaluation with editable beta and theta inputs.</p>`,
              `
                <div class="analysis-grid">
                  <section class="subpanel">
                    <div class="metric-grid">
                      ${metricCard("Vc", `${formatNumber(shear.vc, 1)} k`, "Concrete contribution")}
                      ${metricCard("Vs", `${formatNumber(shear.vs, 1)} k`, "Stirrup contribution")}
                      ${metricCard("Vn", `${formatNumber(shear.vn, 1)} k`, shear.controlsLimit ? "Governed by web crushing limit" : "Vc + Vs")}
                      ${metricCard("phiVn", `${formatNumber(shear.phiVn, 1)} k`, "Design shear capacity")}
                    </div>
                    <div class="equation-stack">
                      ${equationBlock("V_n = V_c + V_s")}
                      ${equationBlock("V_c = 0.0316\\beta\\sqrt{f'_c}b_wd_v")}
                      ${equationBlock("V_s = \\frac{A_vf_yd_v(\\cot\\theta + \\cot\\alpha)\\sin\\alpha}{s}")}
                    </div>
                  </section>
                  <section class="subpanel">
                    <div class="kv-grid">
                      ${keyValueRows([
                        ["Effective shear depth dv", `${formatNumber(shear.dv, 2)} in`],
                        ["Beta", formatNumber(shear.beta, 2)],
                        ["Theta", `${formatNumber(shear.thetaDeg, 1)} deg`],
                        ["Av", `${formatNumber(reinforcement.shearArea, 2)} in²`],
                        ["Stirrup spacing s", `${formatNumber(state.reinforcement.stirrupSpacing, 1)} in`],
                        ["Design shear phiVn", `${formatNumber(shear.phiVn, 1)} k`]
                      ])}
                    </div>
                  </section>
                </div>
              `
            )}
          </details>

          <details class="panel workspace-panel" open id="drawings">
            ${renderPanelSummary(
              `<p class="panel-kicker">Parametric Drawings</p><h2>Cross-section, flexure, and shear figures</h2><p>Each drawing is built from the same geometry and resistance outputs shown in the calculations.</p>`,
              `
                <div class="drawing-grid">
                  <article class="drawing-card">
                    <h3>T-beam cross section</h3>
                    ${renderSectionDrawing(snapshot)}
                  </article>
                  <article class="drawing-card">
                    <h3>Flexural stress diagram</h3>
                    ${renderFlexureDrawing(snapshot)}
                  </article>
                  <article class="drawing-card">
                    <h3>Shear reinforcement diagram</h3>
                    ${renderShearDrawing(snapshot)}
                  </article>
                </div>
              `
            )}
          </details>

          <details class="panel workspace-panel" open id="calculations">
            ${renderPanelSummary(
              `<p class="panel-kicker">Step-by-Step Calculations</p><h2>Equation trail and substituted values</h2><p>Rendered with LaTeX so the calculation path can be reviewed and printed directly.</p>`,
              `
                <div class="steps-grid">
                  ${renderStepCards("Flexural capacity", flexure.steps)}
                  ${renderStepCards("Shear capacity", shear.steps)}
                </div>
              `
            )}
          </details>

          <details class="panel workspace-panel" open id="report-panel">
            ${renderPanelSummary(
              `<p class="panel-kicker">Printable Report</p><h2>Engineering report output</h2><p>Open the live report in a new tab or print directly to PDF from the browser.</p>`,
              `
                <div class="report-preview-grid">
                  <article class="subpanel">
                    <h3>Included in the report</h3>
                    <div class="report-outline">
                      <div>Section geometry and effective dimensions</div>
                      <div>Material and reinforcement schedule</div>
                      <div>Flexural and shear equations with substituted values</div>
                      <div>Parametric SVG drawings</div>
                      <div>Final design summary with phiMn and phiVn</div>
                    </div>
                    <div class="report-actions">
                      <button class="action-button action-button--primary" data-action="open-report">Open report window</button>
                      <button class="action-button" data-action="print-report">Print / Save PDF</button>
                    </div>
                  </article>
                  <article class="subpanel">
                    <h3>Report title block</h3>
                    <div class="kv-grid">
                      ${keyValueRows([
                        ["Project", state.project.name],
                        ["Designer", state.project.designer],
                        ["Date", state.project.date],
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
    </div>
  `;
}
